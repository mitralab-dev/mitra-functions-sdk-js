import { inspect } from "node:util"
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest"
import { createClient, MitraApiError } from "./index"
import type {
  AiProviders,
  AiProvidersModule,
  Fetch,
  IncludedAiQuota,
  IncludedAiQuotaWindow,
  ManagedAiProfile,
  MitraClient,
  OpencodeAiProvider,
} from "./index"

const managedAiProfile: ManagedAiProfile = {
  profile: "IMMERSION",
  agentType: "IMMERSION",
  selectionMode: "FORCED",
  model: "immersion",
  requiredScope: "ACCOUNT",
}
const day: IncludedAiQuotaWindow = {
  limit: 100,
  left: 0,
  leftCenticredits: 0,
  resetsAt: "2026-10-30T00:00:00Z",
}
const quota: IncludedAiQuota = {
  planCode: "FREE",
  blockingWindow: "DAY",
  windows: { day },
  remainingTokens: 0,
}
const opencode: OpencodeAiProvider = {
  connected: false,
  presetId: null,
  presetName: null,
  authMethod: null,
  providerId: null,
  baseUrl: null,
  models: null,
}
const config = {
  apiUrl: "https://api.example.com/",
  accessToken: "runtime-token",
  appId: "runtime-app",
}

function providers(): AiProviders {
  return {
    activeEngine: "CODEX",
    includedAiAvailable: false,
    includedAiQuota: quota,
    activeCustomProviderId: null,
    customProviders: [],
    opencode,
  }
}

function mockFetch(body: unknown, status = 200) {
  return vi.fn<Fetch>(async () =>
    Response.json(body, { status, headers: { "X-Request-Id": "providers-request" } }),
  )
}

afterEach(() => vi.unstubAllEnvs())

describe.each(["config", "runtime"] as const)("aiProviders with %s", (source) => {
  it.each([
    { name: "IMMERSION with exhausted personal quota", profile: { managedAiProfile } },
    { name: "an ineligible account", profile: { managedAiProfile: null } },
    { name: "a server without managed profiles", profile: {} },
  ])("reads $name with one authenticated GET and no key creation", async ({ profile }) => {
    const response = { ...providers(), ...profile }
    const fetch = mockFetch(response)
    if (source === "runtime") {
      vi.stubEnv("MITRA_API_URL", undefined)
      vi.stubEnv("MITRA_PLATFORM_ACCESS_TOKEN", undefined)
      vi.stubEnv("MITRA_APP_ID", undefined)
      vi.stubEnv("MITRA_BASE_URL", "https://api.example.com/legacy")
      vi.stubEnv("MITRA_TOKEN", config.accessToken)
      vi.stubEnv("MITRA_PROJECT_ID", config.appId)
    }
    const client = createClient(source === "runtime" ? { fetch } : { ...config, fetch })
    expect(fetch).not.toHaveBeenCalled()
    expect(JSON.stringify(client)).not.toContain(config.accessToken)
    expect(inspect(client, { depth: null, showHidden: true })).not.toContain(config.accessToken)

    const result = await client.aiProviders.get()

    expect(result).toEqual(response)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(String(fetch.mock.calls[0]?.[0])).toBe(
      "https://api.example.com/copilot/api/v1/ai-providers",
    )
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "X-App-Id": config.appId,
      },
    })
    expect(fetch.mock.calls[0]?.[1]?.body).toBeUndefined()
    expect(result).not.toHaveProperty("apiKey")
    expect(result.managedAiProfile ?? {}).not.toHaveProperty("apiKey")
    expectTypeOf(result).toEqualTypeOf<AiProviders>()
    expectTypeOf<Pick<MitraClient, "aiProviders">>().toEqualTypeOf<{
      readonly aiProviders: AiProvidersModule
    }>()
  })
})

describe("aiProviders errors", () => {
  it.each([
    { status: 403, code: "IMMERSION_NOT_ELIGIBLE" },
    { status: 503, code: "IMMERSION_UNAVAILABLE" },
  ])("preserves $status/$code without retrying or exposing the token", async ({ status, code }) => {
    const fetch = mockFetch(
      {
        code,
        message: `Upstream echoed ${config.accessToken}`,
        details: { token: config.accessToken },
      },
      status,
    )
    const client = createClient({ ...config, fetch })
    const error = await client.aiProviders.get().catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(MitraApiError)
    expect(error).toMatchObject({ status, code, requestId: "providers-request" })
    expect(String(error)).not.toContain(config.accessToken)
    expect(JSON.stringify(error)).not.toContain(config.accessToken)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("uses the Functions error factory when Core rejects a malformed response", async () => {
    const fetch = mockFetch({ ...providers(), managedAiProfile: { profile: "IMMERSION" } })
    const error = await createClient({ ...config, fetch })
      .aiProviders.get()
      .catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(MitraApiError)
    expect(error).toMatchObject({ code: "INVALID_RESPONSE", retryable: false })
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
