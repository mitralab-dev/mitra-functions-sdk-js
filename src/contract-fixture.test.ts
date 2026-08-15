import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import { describe, expect, it, vi } from "vitest"
import { MitraApiError, createClient } from "./index"
import type { Fetch } from "./index"

interface ContractRequest {
  service: "auth" | "dataManager" | "functions" | "integration"
  method: string
  path: string
  params?: Record<string, string | number | boolean>
  headers?: Record<string, string>
  body?: unknown
}

interface ExpectedError {
  type: "api" | "network" | "response"
  status: number
  code: string
  message: string
  details: unknown
  requestId: string | null
  retryable: boolean
}

interface HttpAdapterCase {
  id: string
  operation: "auth.me" | "queries.execute"
  input: {
    id?: string
    dataSourceId?: string
    parameters?: Record<string, unknown>
  }
  request: ContractRequest
  response?: {
    status: number
    body: unknown
  }
  failure?: {
    type: "timeout"
  }
  expectedError: ExpectedError
}

interface ContractCorpus {
  contract: string
  version: string
  consumerRequirements: Record<string, Record<string, string>>
  httpAdapterCases: HttpAdapterCase[]
}

interface RecordedRequest {
  url: URL
  init: RequestInit
}

function loadInstalledCorpus(): ContractCorpus {
  const require = createRequire(import.meta.url)
  const coreEntry = require.resolve("@mitralab.io/sdk-core")
  const fixturePath = join(
    resolve(dirname(coreEntry), ".."),
    "contracts",
    "v0.1.0",
    "sdk-parity.json",
  )
  return JSON.parse(readFileSync(fixturePath, "utf8")) as ContractCorpus
}

const corpus = loadInstalledCorpus()

function fetchFor(testCase: HttpAdapterCase): {
  fetch: ReturnType<typeof vi.fn<Fetch>>
  requests: RecordedRequest[]
} {
  const requests: RecordedRequest[] = []
  const fetch = vi.fn<Fetch>((input, init = {}) => {
    requests.push({ url: new URL(String(input)), init })
    if (testCase.failure?.type === "timeout") {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"))
        })
      })
    }
    const response = testCase.response
    if (!response) throw new Error(`Missing response for ${testCase.id}`)
    return Promise.resolve(
      new Response(JSON.stringify(response.body), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      }),
    )
  })
  return { fetch, requests }
}

async function executeCase(testCase: HttpAdapterCase, fetch: Fetch): Promise<unknown> {
  const client = createClient({
    apiUrl: "https://api.mitra.test",
    accessToken: "fixture-token",
    appId: "app-1",
    ...(testCase.input.dataSourceId === undefined
      ? {}
      : { dataSourceId: testCase.input.dataSourceId }),
    timeoutMs: 1,
    fetch,
  })
  if (testCase.operation === "auth.me") return client.auth.me()
  return client.queries.execute(testCase.input.id!, testCase.input.parameters)
}

function assertRequest(testCase: HttpAdapterCase, requests: RecordedRequest[]): void {
  expect(requests).toHaveLength(1)
  const actual = requests[0]!
  const expected = testCase.request
  const service = {
    auth: "iam",
    dataManager: "data-manager",
    functions: "functions",
    integration: "integration",
  }[expected.service]

  expect(actual.init.method).toBe(expected.method)
  expect(actual.url.pathname).toBe(`/${service}${expected.path}`)
  expect(Object.fromEntries(actual.url.searchParams)).toEqual(
    Object.fromEntries(
      Object.entries(expected.params ?? {}).map(([key, value]) => [key, String(value)]),
    ),
  )

  const headers = new Headers(actual.init.headers)
  expect(headers.get("Authorization")).toBe("Bearer fixture-token")
  expect(headers.get("X-App-Id")).toBe("app-1")
  for (const [key, value] of Object.entries(expected.headers ?? {})) {
    expect(headers.get(key)).toBe(value)
  }

  if ("body" in expected) {
    expect(JSON.parse(String(actual.init.body))).toEqual(expected.body)
  } else {
    expect(actual.init.body).toBeUndefined()
  }
}

describe("canonical sdk-core HTTP adapter corpus", () => {
  it("proves the exact consumer requirement categories", () => {
    expect(corpus.contract).toBe("SDK-PARITY-001")
    expect(corpus.version).toBe("0.1.0")
    expect(corpus.consumerRequirements["@mitralab.io/functions-sdk"]).toEqual({
      httpAdapterCases: "all",
    })
  })

  it("contains every required HTTP adapter category", () => {
    expect(corpus.httpAdapterCases.map(({ id }) => id)).toEqual([
      "queries.execute.data-source-not-found",
      "queries.execute.database-unavailable",
      "auth.me.timeout",
    ])
  })

  it.each(corpus.httpAdapterCases)("$id", async (testCase) => {
    const { fetch, requests } = fetchFor(testCase)
    let error: unknown
    try {
      await executeCase(testCase, fetch)
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(MitraApiError)
    const actual = error as MitraApiError
    expect({
      type:
        actual.status === 0 ? "network" : actual.code === "INVALID_RESPONSE" ? "response" : "api",
      status: actual.status,
      code: actual.code,
      message: actual.message,
      details: actual.details ?? null,
      requestId: actual.requestId ?? null,
      retryable: actual.retryable,
    }).toEqual(testCase.expectedError)
    assertRequest(testCase, requests)
  })
})
