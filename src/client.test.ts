import { inspect } from "node:util"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  MitraApiError,
  MitraConfigurationError,
  createClient,
  createClientFromEnvironment,
} from "./index"
import type { Fetch, FunctionExecution, MitraEnvironment } from "./index"

const config = {
  apiUrl: "https://api.example.com/",
  accessToken: "secret-access-token",
  appId: "app/one",
  dataSourceId: "data-source-1",
  timeoutMs: 100,
}
const configWithoutDataSource = {
  apiUrl: config.apiUrl,
  accessToken: config.accessToken,
  appId: config.appId,
  timeoutMs: config.timeoutMs,
}

function json(body: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  })
}

function mockFetch(...responses: Response[]): ReturnType<typeof vi.fn<Fetch>> {
  return vi.fn<Fetch>(async () => {
    const response = responses.shift()
    if (!response) throw new Error("No mock response configured")
    return response
  })
}

function requestAt(fetchMock: ReturnType<typeof vi.fn<Fetch>>, index = 0) {
  const call = fetchMock.mock.calls[index]
  if (!call) throw new Error(`Missing fetch call at index ${index}`)
  return { url: String(call[0]), init: call[1] as RequestInit }
}

function execution(status = "SUCCESS"): FunctionExecution {
  return {
    id: "execution-1",
    functionId: "function-1",
    functionVersionId: "version-1",
    status,
    input: {},
    output: { ok: true },
    errorMessage: null,
    logs: null,
    durationMs: 10,
    startedAt: "2026-01-01T00:00:00Z",
    finishedAt: "2026-01-01T00:00:01Z",
    createdAt: "2026-01-01T00:00:00Z",
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("configuration", () => {
  it("lets createClient read the runtime environment", async () => {
    vi.stubEnv("MITRA_API_URL", "https://runtime.example.com")
    vi.stubEnv("MITRA_PLATFORM_ACCESS_TOKEN", "runtime-token")
    vi.stubEnv("MITRA_APP_ID", "runtime-app")
    vi.stubEnv("MITRA_DATA_SOURCE_ID", "runtime-data-source")
    const fetch = mockFetch(
      json({
        id: "user-1",
        tenant: {
          id: "tenant-1",
          shortId: "short",
          legacyId: null,
          slug: "tenant",
          plan: { id: "plan-1", name: "Free" },
          name: "Tenant",
          description: null,
          hexColor: null,
          icon: null,
          infraStatus: "READY",
          active: true,
        },
        name: "Ada",
        email: "ada@example.com",
        imageUrl: null,
        onboardingCompleted: true,
      }),
    )

    await createClient({ fetch }).auth.me()

    expect(requestAt(fetch).url).toBe("https://runtime.example.com/iam/api/v1/auth/me")
    expect(requestAt(fetch).init.headers).toMatchObject({
      Authorization: "Bearer runtime-token",
      "X-App-Id": "runtime-app",
    })
  })

  it("creates a client from an explicit environment", async () => {
    const fetch = mockFetch(
      json({
        id: "user-1",
        tenant: {
          id: "tenant-1",
          shortId: "short",
          legacyId: null,
          slug: "tenant",
          plan: { id: "plan-1", name: "Free" },
          name: "Tenant",
          description: null,
          hexColor: null,
          icon: null,
          infraStatus: "READY",
          active: true,
        },
        name: "Ada",
        email: "ada@example.com",
        imageUrl: null,
        onboardingCompleted: true,
      }),
    )
    const environment: MitraEnvironment = {
      MITRA_API_URL: "https://api.example.com",
      MITRA_PLATFORM_ACCESS_TOKEN: "runtime-token",
      MITRA_APP_ID: "runtime-app",
      MITRA_DATA_SOURCE_ID: "runtime-data-source",
    }

    const client = createClientFromEnvironment(environment)
    const explicitFetchClient = createClient({
      ...config,
      accessToken: environment.MITRA_PLATFORM_ACCESS_TOKEN!,
      appId: environment.MITRA_APP_ID!,
      fetch,
    })
    const user = await explicitFetchClient.auth.me()

    expect(client).toBeDefined()
    expect(user.tenant.slug).toBe("tenant")
    expect(requestAt(fetch).url).toBe("https://api.example.com/iam/api/v1/auth/me")
    expect(requestAt(fetch).init.headers).toMatchObject({
      Authorization: "Bearer runtime-token",
      "X-App-Id": "runtime-app",
    })
  })

  it.each([
    [{ accessToken: "token", appId: "app" }, "apiUrl is required"],
    [{ apiUrl: "https://api.example.com", appId: "app" }, "accessToken is required"],
    [{ apiUrl: "https://api.example.com", accessToken: "token" }, "appId is required"],
    [{ ...config, apiUrl: "ftp://api.example.com" }, "valid HTTP or HTTPS"],
    [{ ...config, apiUrl: "https://user:pass@api.example.com" }, "must not include credentials"],
    [{ ...config, apiUrl: "https://api.example.com?token=value" }, "must not include credentials"],
    [{ ...config, apiUrl: "https://api.example.com#fragment" }, "must not include credentials"],
    [{ ...config, timeoutMs: 0 }, "timeoutMs must be a positive number"],
    [{ ...config, dataSourceId: " " }, "dataSourceId must not be empty"],
  ] as const)("rejects invalid configuration", (invalidConfig, message) => {
    expect(() => createClient(invalidConfig)).toThrow(message)
  })

  it("does not expose the token in configuration errors", () => {
    const token = "must-never-appear"
    let error: unknown
    try {
      createClient({ apiUrl: "not-a-url", accessToken: token, appId: "app" })
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(MitraConfigurationError)
    expect(String(error)).not.toContain(token)
  })

  it("does not expose the token through client serialization or inspection", () => {
    const token = "audit-secret-token"
    const client = createClient({ ...config, accessToken: token, fetch: mockFetch() })

    expect(JSON.stringify(client)).not.toContain(token)
    expect(inspect(client, { depth: null, showHidden: true })).not.toContain(token)
    expect(Object.keys(client)).not.toContain("config")
    expect(Object.keys(client)).not.toContain("codeStudioHttpClient")
  })
})

describe("initialization", () => {
  it("does not request app info when a data source is configured", async () => {
    const fetch = mockFetch()
    const client = createClient({ ...config, fetch })

    await client.init()

    expect(fetch).not.toHaveBeenCalled()
  })

  it("resolves the data source once for concurrent calls", async () => {
    const fetch = mockFetch(
      json({ dataSourceId: "resolved-data-source" }),
      json({ rows: [], affectedRows: null, durationMs: 4 }),
    )
    const client = createClient({ ...configWithoutDataSource, fetch })

    await Promise.all([client.init(), client.init()])
    await client.queries.execute("query/one", { active: true })

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(requestAt(fetch).url).toBe(
      "https://api.example.com/code-studio/api/v1/apps/app%2Fone/info",
    )
    expect(JSON.parse(String(requestAt(fetch, 1).init.body))).toEqual({
      dataSourceId: "resolved-data-source",
      parameters: { active: true },
    })
  })

  it("requires initialization only for queries", async () => {
    const fetch = mockFetch(json({ data: [], limit: 100, skip: 0, total: 0, hasMore: false }))
    const client = createClient({ ...configWithoutDataSource, fetch })

    await expect(client.entities.Task!.list()).resolves.toEqual([])
    await expect(client.queries.execute("query-id")).rejects.toThrow("Call client.init()")
  })

  it("rejects app info without a data source and allows a later retry", async () => {
    const fetch = mockFetch(json({ allowSignup: true }), json({ dataSourceId: "resolved" }))
    const client = createClient({ ...configWithoutDataSource, fetch })

    await expect(client.init()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      retryable: false,
      status: 200,
    })
    await expect(client.init()).resolves.toBeUndefined()
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})

describe("entities", () => {
  it("supports typed and dynamic list and filter access", async () => {
    const fetch = mockFetch(
      json({ data: [{ id: "1" }], limit: 10, skip: 2, total: 1, hasMore: false }),
      json({ data: [{ id: "2" }], limit: 5, skip: 0, total: 1, hasMore: false }),
    )
    const client = createClient({ ...config, fetch })

    await expect(
      client.entities.getTable<{ id: string }>("Order items").list({
        sort: "-created_at",
        limit: 10,
        skip: 2,
        fields: ["id", "name"],
      }),
    ).resolves.toEqual([{ id: "1" }])
    await expect(client.entities.Task!.filter({ status: "open" }, "name", 5)).resolves.toEqual([
      { id: "2" },
    ])

    expect(requestAt(fetch).url).toBe(
      "https://api.example.com/data-manager/api/v1/tables/Order%20items/records?sort=-created_at&limit=10&skip=2&fields=id%2Cname",
    )
    expect(requestAt(fetch, 1).url).toContain(
      "/data-manager/api/v1/tables/Task/records?q=%7B%22status%22%3A%22open%22%7D&sort=name&limit=5",
    )
  })

  it("preserves positional list parameters", async () => {
    const fetch = mockFetch(json({ data: [], limit: 2, skip: 4, total: 0, hasMore: false }))
    const client = createClient({ ...config, fetch })

    await client.entities.Task!.list("name", 2, 4, ["id"])

    expect(requestAt(fetch).url).toContain("sort=name&limit=2&skip=4&fields=id")
  })

  it("executes get, create, bulk create, update, delete, and deleteMany", async () => {
    const fetch = mockFetch(
      json({ id: "record/1" }),
      json({ id: "record-2", name: "created" }, 201),
      json([{ id: "record-3" }], 201),
      json({ id: "record-2", name: "updated" }),
      new Response(null, { status: 204 }),
      json({ deleted: 2 }),
    )
    const table = createClient({ ...config, fetch }).entities.getTable<{
      id: string
      name: string
    }>("Orders")

    await table.get("record/1")
    await table.create({ name: "created" })
    await table.bulkCreate([{ name: "bulk" }])
    await table.update("record-2", { name: "updated" })
    await expect(table.delete("record-2")).resolves.toBeUndefined()
    await expect(table.deleteMany({ status: "cancelled" })).resolves.toEqual({ deleted: 2 })

    const requests = fetch.mock.calls.map((_, index) => requestAt(fetch, index))
    expect(requests.map(({ init }) => init.method)).toEqual([
      "GET",
      "POST",
      "POST",
      "PUT",
      "DELETE",
      "DELETE",
    ])
    expect(requests[0]?.url).toContain("/Orders/records/record%2F1")
    expect(requests[2]?.url).toContain("/Orders/records/bulk")
    expect(requests[5]?.url).toContain("q=%7B%22status%22%3A%22cancelled%22%7D")
  })

  it("rejects empty table names and record ids", async () => {
    const client = createClient({ ...config, fetch: mockFetch() })
    expect(() => client.entities.getTable(" ")).toThrow("tableName must not be empty")
    await expect(client.entities.Task!.get(" ")).rejects.toThrow("id must not be empty")
    await expect(client.entities.Task!.deleteMany({})).rejects.toThrow(
      "query must not be empty for deleteMany",
    )
  })

  it("rejects structurally invalid entity responses", async () => {
    const fetch = mockFetch(
      json({}),
      json({ records: [] }),
      json({ deleted: "2" }),
      json({ unexpected: true }),
    )
    const table = createClient({ ...config, fetch }).entities.Task!

    await expect(table.list()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      retryable: false,
    })
    await expect(table.bulkCreate([{ title: "A" }])).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    })
    await expect(table.deleteMany({ status: "archived" })).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    })
    await expect(table.delete("record-id")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    })
  })
})

describe("functions and integrations", () => {
  it("executes functions with explicit sync and async invocation headers", async () => {
    const fetch = mockFetch(json(execution()), json(execution("PENDING")))
    const client = createClient({ ...config, fetch })

    await client.functions.execute("function/one", { value: 1 })
    await client.functions.executeAsync("function/two")

    expect(requestAt(fetch).url).toContain("/functions/api/v1/functions/function%2Fone/execute")
    expect(requestAt(fetch).init.headers).toMatchObject({ "X-Invocation-Type": "sync" })
    expect(JSON.parse(String(requestAt(fetch).init.body))).toEqual({ input: { value: 1 } })
    expect(requestAt(fetch, 1).init.headers).toMatchObject({ "X-Invocation-Type": "async" })
    expect(JSON.parse(String(requestAt(fetch, 1).init.body))).toEqual({ input: {} })
  })

  it("reads and cancels an execution, including a 204 response", async () => {
    const fetch = mockFetch(json(execution()), new Response(null, { status: 204 }))
    const client = createClient({ ...config, fetch })

    await expect(client.functions.getExecution("execution/1")).resolves.toMatchObject({
      id: "execution-1",
    })
    await expect(client.functions.cancelExecution("execution/1")).resolves.toBeUndefined()

    expect(requestAt(fetch).url).toContain("/functions/api/v1/executions/execution%2F1")
    expect(requestAt(fetch, 1).url).toContain("/executions/execution%2F1/cancel")
    expect(requestAt(fetch, 1).init.method).toBe("POST")
  })

  it("rejects a non-empty cancel response", async () => {
    const fetch = mockFetch(json({ unexpected: true }))
    const client = createClient({ ...config, fetch })

    await expect(client.functions.cancelExecution("execution-id")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    })
  })

  it("executes integration resources and direct proxy requests", async () => {
    const result = {
      status: 200,
      headers: {},
      body: { ok: true },
      durationMs: 20,
      executionId: "integration-execution",
    }
    const fetch = mockFetch(json(result), json(result))
    const client = createClient({ ...config, fetch })

    await client.integration.executeResource("resource/one", { id: 1 })
    await client.integration.execute("config/one", {
      method: "GET",
      endpoint: "/users",
      queryParams: { limit: 10, active: true },
    })

    expect(requestAt(fetch).url).toContain("/resources/resource%2Fone/execute")
    expect(JSON.parse(String(requestAt(fetch).init.body))).toEqual({ params: { id: 1 } })
    expect(requestAt(fetch, 1).url).toContain("/template-configs/config%2Fone/execute")
    expect(JSON.parse(String(requestAt(fetch, 1).init.body))).toEqual({
      method: "GET",
      endpoint: "/users",
      queryParams: { limit: 10, active: true },
      source: "SDK",
    })
  })
})

describe("path safety", () => {
  it("rejects dot segments before making any request", async () => {
    const fetch = mockFetch()
    const client = createClient({ ...config, fetch })

    expect(() => client.entities.getTable("..")).toThrow("must not be a dot segment")
    await expect(client.entities.Orders!.get("..")).rejects.toThrow("must not be a dot segment")
    expect(() => client.entities.Orders!.delete("..")).toThrow("must not be a dot segment")
    expect(() => client.functions.execute("..")).toThrow("must not be a dot segment")
    expect(() => client.functions.getExecution(".")).toThrow("must not be a dot segment")
    await expect(client.queries.execute("..")).rejects.toThrow("must not be a dot segment")
    await expect(client.integration.executeResource("..")).rejects.toThrow(
      "must not be a dot segment",
    )
    await expect(
      client.integration.execute(".", { method: "GET", endpoint: "/users" }),
    ).rejects.toThrow("must not be a dot segment")
    await expect(
      createClient({ ...configWithoutDataSource, appId: "..", fetch }).init(),
    ).rejects.toThrow("must not be a dot segment")

    expect(fetch).not.toHaveBeenCalled()
  })
})

describe("HTTP failures", () => {
  it("rejects non-object success payloads across modules", async () => {
    const fetch = mockFetch(json(null), json([]), json(null), json([]), json(null))
    const client = createClient({ ...config, fetch })

    await expect(client.auth.me()).rejects.toMatchObject({ code: "INVALID_RESPONSE" })
    await expect(client.queries.execute("query-id")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    })
    await expect(client.functions.execute("function-id")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    })
    await expect(client.integration.executeResource("resource-id")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    })
    await expect(createClient({ ...configWithoutDataSource, fetch }).init()).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    })
  })

  it("supports both API error code styles and payload request metadata", async () => {
    const fetch = mockFetch(
      json(
        {
          message: "Entity not found",
          error_code: "ENTITY_NOT_FOUND",
          details: { entity: "Order" },
          request_id: "request-from-payload",
          retryable: false,
        },
        404,
      ),
      json({ message: "Conflict", code: "CONFLICT" }, 409),
    )
    const client = createClient({ ...config, fetch })

    await expect(client.entities.Order!.get("missing")).rejects.toMatchObject({
      status: 404,
      code: "ENTITY_NOT_FOUND",
      details: { entity: "Order" },
      requestId: "request-from-payload",
      retryable: false,
    })
    await expect(client.entities.Order!.get("conflict")).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
    })
  })

  it("falls back to each valid API error field independently", async () => {
    const fetch = mockFetch(
      json(
        {
          message: "Entity not found",
          error_code: null,
          code: "ENTITY_NOT_FOUND",
          request_id: 42,
          requestId: "request-from-camel-case",
        },
        404,
      ),
    )

    await expect(createClient({ ...config, fetch }).auth.me()).rejects.toMatchObject({
      code: "ENTITY_NOT_FOUND",
      requestId: "request-from-camel-case",
    })
  })

  it("uses X-Request-Id when the error payload has no request id", async () => {
    const fetch = mockFetch(
      json({ message: "Unavailable", code: "UNAVAILABLE" }, 503, {
        "X-Request-Id": "request-from-header",
      }),
    )

    await expect(createClient({ ...config, fetch }).auth.me()).rejects.toMatchObject({
      requestId: "request-from-header",
    })
  })

  it("redacts credentials from API errors and nested details", async () => {
    const token = config.accessToken
    const fetch = mockFetch(
      json(
        {
          message: `Upstream echoed ${token}`,
          code: "UPSTREAM_ERROR",
          details: {
            accessToken: token,
            nested: { message: `Bearer ${token}` },
          },
        },
        500,
      ),
    )

    let error: unknown
    try {
      await createClient({ ...config, fetch }).auth.me()
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(MitraApiError)
    expect(JSON.stringify(error)).not.toContain(token)
    expect((error as Error).message).not.toContain(token)
  })

  it("redacts an access token used as a nested detail key", async () => {
    const token = "opaque-credential-value"
    const fetch = mockFetch(
      json(
        {
          message: "Upstream error",
          details: { nested: { [token]: "safe value" } },
        },
        500,
      ),
    )

    let error: unknown
    try {
      await createClient({ ...config, accessToken: token, fetch }).auth.me()
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(MitraApiError)
    expect((error as MitraApiError).details).toEqual({
      nested: { "[REDACTED]": "safe value" },
    })
    expect(JSON.stringify(error)).not.toContain(token)
  })

  it("redacts foreign bearer credentials across API error metadata", async () => {
    const credentials = {
      message: "foreign-message",
      code: "foreign-code",
      requestId: "foreign-request",
      key: "foreign-key",
      value: "foreign-value",
    }
    const fetch = mockFetch(
      json(
        {
          message: `Upstream rejected Bearer ${credentials.message} but kept this context`,
          code: `UPSTREAM Bearer ${credentials.code}`,
          request_id: `request Bearer ${credentials.requestId}`,
          details: {
            nested: {
              [`metadata Bearer ${credentials.key}`]: `value before Bearer ${credentials.value} value after`,
            },
          },
        },
        500,
      ),
    )

    let error: unknown
    try {
      await createClient({ ...config, fetch }).auth.me()
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(MitraApiError)
    const apiError = error as MitraApiError
    expect(apiError.message).toBe("Upstream rejected Bearer [REDACTED] but kept this context")
    expect(apiError.code).toBe("UPSTREAM Bearer [REDACTED]")
    expect(apiError.requestId).toBe("request Bearer [REDACTED]")
    expect(apiError.details).toEqual({
      nested: {
        "metadata Bearer [REDACTED]": "value before Bearer [REDACTED] value after",
      },
    })

    const serialized = JSON.stringify(apiError)
    const inspected = inspect(apiError, { depth: null, showHidden: true })
    for (const credential of Object.values(credentials)) {
      expect(serialized).not.toContain(credential)
      expect(inspected).not.toContain(credential)
    }
    expect(inspected).toContain("kept this context")
    expect(serialized).toContain("value before Bearer [REDACTED] value after")
  })

  it("redacts generic bearer credentials when the exact access token is Bearer", async () => {
    const accessToken = "Bearer"
    const credentials = {
      message: "foreign-message-credential",
      code: "foreign-code-credential",
      requestId: "foreign-request-credential",
      key: "foreign-key-credential",
      value: "foreign-value-credential",
    }
    const fetch = mockFetch(
      json(
        {
          message: `Bearer ${credentials.message}`,
          code: `Bearer ${credentials.code}`,
          requestId: `Bearer ${credentials.requestId}`,
          details: {
            nested: {
              [`Bearer ${credentials.key}`]: `Bearer ${credentials.value}`,
              exactToken: accessToken,
            },
          },
        },
        500,
      ),
    )

    let error: unknown
    try {
      await createClient({ ...config, accessToken, fetch }).auth.me()
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(MitraApiError)
    const apiError = error as MitraApiError
    const serialized = JSON.stringify(apiError)
    const inspected = inspect(apiError, { depth: null, showHidden: true })
    for (const credential of [accessToken, ...Object.values(credentials)]) {
      expect(apiError.message).not.toContain(credential)
      expect(apiError.code).not.toContain(credential)
      expect(apiError.requestId).not.toContain(credential)
      expect(serialized).not.toContain(credential)
      expect(inspected).not.toContain(credential)
    }
    expect(apiError.details).toEqual({
      nested: {
        "[REDACTED] [REDACTED]": "[REDACTED] [REDACTED]",
        exactToken: "[REDACTED]",
      },
    })
  })

  it("reports invalid successful JSON", async () => {
    const fetch = mockFetch(new Response("not-json", { status: 200 }))

    await expect(createClient({ ...config, fetch }).auth.me()).rejects.toMatchObject({
      status: 200,
      code: "INVALID_RESPONSE",
      retryable: false,
    })
  })

  it("reports non-JSON server errors without exposing the response", async () => {
    const fetch = mockFetch(new Response("internal details", { status: 500 }))

    await expect(createClient({ ...config, fetch }).auth.me()).rejects.toMatchObject({
      status: 500,
      message: "Request failed with status 500",
    })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("does not follow redirects or replay writes", async () => {
    const fetch = mockFetch(
      new Response(null, { status: 307, headers: { Location: "https://other.test" } }),
    )

    await expect(
      createClient({ ...config, fetch }).entities.Order!.create({ status: "new" }),
    ).rejects.toMatchObject({ status: 307 })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(requestAt(fetch).init.redirect).toBe("manual")
  })

  it("wraps network failures", async () => {
    const fetch = vi.fn<Fetch>(async () => {
      throw new Error("socket failed")
    })

    await expect(createClient({ ...config, fetch }).auth.me()).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
      retryable: true,
    })
  })

  it("aborts timed out requests", async () => {
    const fetch = vi.fn<Fetch>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          )
        }),
    )

    await expect(createClient({ ...config, timeoutMs: 1, fetch }).auth.me()).rejects.toMatchObject({
      status: 0,
      code: "REQUEST_TIMEOUT",
      retryable: true,
    })
  })
})
