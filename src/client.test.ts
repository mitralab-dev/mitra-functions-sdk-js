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

function appDefinition(name = "Runtime app") {
  return {
    id: config.appId,
    shortId: "runtime-app",
    subdomain: "runtime-app",
    brand: "mitra",
    domains: [],
    legacyId: null,
    name,
    description: null,
    color: { type: "SOLID", hex: "#7839EE" },
    icon: null,
    dataSourceId: config.dataSourceId,
    planId: "plan-1",
    template: "react-vite-shadcn",
    allowSignup: true,
    externalAccessEnabled: false,
    currentVersion: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  }
}

function appDeploy() {
  return {
    id: "deploy-1",
    appId: config.appId,
    appVersionId: "version-1",
    status: "BUILDING",
    deployUrl: null,
    errorMessage: null,
    logs: null,
    durationMs: null,
    startedAt: "2026-01-01T00:00:00Z",
    finishedAt: null,
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

  it("does not route native calls through deprecated runtime aliases", () => {
    vi.stubEnv("MITRA_BASE_URL", "https://runtime.example.com")
    vi.stubEnv("MITRA_TOKEN", "runtime-token")
    vi.stubEnv("MITRA_PROJECT_ID", "runtime-app")

    expect(() => createClient()).toThrow("apiUrl is required")
  })

  it("prefers the canonical runtime names over their compatibility aliases", async () => {
    vi.stubEnv("MITRA_API_URL", "https://canonical.example.com")
    vi.stubEnv("MITRA_PLATFORM_ACCESS_TOKEN", "canonical-token")
    vi.stubEnv("MITRA_APP_ID", "canonical-app")
    vi.stubEnv("MITRA_BASE_URL", "https://compatibility.example.com")
    vi.stubEnv("MITRA_TOKEN", "compatibility-token")
    vi.stubEnv("MITRA_PROJECT_ID", "compatibility-app")
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

    expect(requestAt(fetch).url).toBe("https://canonical.example.com/iam/api/v1/auth/me")
    expect(requestAt(fetch).init.headers).toMatchObject({
      Authorization: "Bearer canonical-token",
      "X-App-Id": "canonical-app",
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

  it("removes every trailing slash from the configured API URL", async () => {
    const fetch = mockFetch(json({ data: [], limit: 1, skip: 0, total: 0, hasMore: false }))
    const client = createClient({ ...config, apiUrl: "https://api.example.com/root///", fetch })

    await client.entities.Task!.list({ limit: 1 })

    expect(requestAt(fetch).url).toBe(
      "https://api.example.com/root/data-manager/api/v1/tables/Task/records?limit=1",
    )
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
  it("exposes every native module without making an eager request", () => {
    const fetch = mockFetch()
    const client = createClient({ ...config, fetch })

    expect([
      client.agentConnections,
      client.agentCredentials,
      client.agents,
      client.agentTasks,
      client.apps,
      client.auth,
      client.context,
      client.currentApp,
      client.customQueries,
      client.dataSources,
      client.entities,
      client.functions,
      client.functionsAdmin,
      client.imports,
      client.integration,
      client.integrationAdmin,
      client.integrationResources,
      client.integrationTemplates,
      client.members,
      client.messenger,
      client.publicFunctions,
      client.queries,
      client.schema,
      client.sql,
      client.workflows,
    ]).not.toContain(undefined)
    expect(fetch).not.toHaveBeenCalled()
  })

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

  it("initializes an app without a Data Source and defers the query failure", async () => {
    const fetch = mockFetch(json({ dataSourceId: null }))
    const client = createClient({ ...configWithoutDataSource, fetch })

    await expect(client.init()).resolves.toBeUndefined()
    await expect(client.queries.execute("query-id")).rejects.toThrow(/dataSourceId/i)
    expect(fetch).toHaveBeenCalledTimes(1)
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

describe("native service transports", () => {
  it("uses the app-scoped Code Studio transport through the current-app facade", async () => {
    const fetch = mockFetch(json(appDefinition()))
    const client = createClient({ ...config, fetch })

    await client.currentApp.update({ name: "Runtime app" })

    expect(requestAt(fetch).url).toBe("https://api.example.com/code-studio/api/v1/apps/app%2Fone")
    expect(requestAt(fetch).init).toMatchObject({
      method: "PATCH",
      headers: {
        Authorization: "Bearer secret-access-token",
        "X-App-Id": "app/one",
      },
      body: JSON.stringify({ name: "Runtime app" }),
    })
  })

  it("preserves current-app get and publish options and returns the preview deploy", async () => {
    const fetch = mockFetch(json(appDefinition()), json(appDefinition()), json(appDeploy()))
    const client = createClient({ ...config, fetch })

    await client.currentApp.get({ version: "PUBLISHED" })
    await client.currentApp.publish({ externalAccess: true })
    const deploy = await client.currentApp.build()

    expect(requestAt(fetch).url).toBe(
      "https://api.example.com/code-studio/api/v1/apps/app%2Fone?version=PUBLISHED",
    )
    expect(requestAt(fetch, 1).init).toMatchObject({
      method: "POST",
      body: JSON.stringify({ externalAccess: true }),
    })
    expect(requestAt(fetch, 2).url).toBe(
      "https://api.example.com/code-studio/api/v1/apps/app%2Fone/build",
    )
    expect(deploy).toEqual(appDeploy())
  })

  it("uses the Copilot transport with query parameters and runtime headers", async () => {
    const fetch = mockFetch(json({ content: [], totalElements: 0 }))
    const client = createClient({ ...config, fetch })

    await client.agentTasks.list({ archived: true, agentId: "agent-1", size: 5 })

    expect(requestAt(fetch).url).toBe(
      "https://api.example.com/copilot/api/v1/tasks?size=5&archived=true&agentId=agent-1",
    )
    expect(requestAt(fetch).init).toMatchObject({
      method: "GET",
      headers: {
        Authorization: "Bearer secret-access-token",
        "X-App-Id": "app/one",
      },
    })
  })

  it("opens the authenticated SSE channel before posting an Agent session input", async () => {
    const task = {
      id: "task-1",
      appId: config.appId,
      agentId: null,
      userId: "user-1",
      title: "Functions session",
      agentType: "CODEX",
      reasoningEffort: null,
      archived: false,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    }
    const encoder = new TextEncoder()
    let eventStreamCancelled = false
    const fetch = vi.fn<Fetch>(async (input, init) => {
      const url = String(input)
      if (url.endsWith("/api/v1/tasks") && init?.method === "POST") return json(task)
      if (url.endsWith("/api/v1/tasks/task-1/events")) {
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode("event: hello\ndata: {}\n\n"))
            },
            cancel() {
              eventStreamCancelled = true
            },
          }),
          { headers: { "Content-Type": "text/event-stream" } },
        )
      }
      if (url.endsWith("/api/v1/tasks/task-1/messages?size=100&sort=createdAt%2Cdesc")) {
        return json({ content: [], totalElements: 0 })
      }
      if (url.endsWith("/api/v1/tasks/task-1/inputs") && init?.method === "POST") {
        return new Response(null, { status: 202 })
      }
      throw new Error(`Unexpected request: ${init?.method} ${url}`)
    })
    const client = createClient({ ...config, fetch })
    const session = client.agentTasks.session({ create: true, agentType: "CODEX" })

    session.send("Build the report")
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(4))

    expect(fetch.mock.calls.map(([input]) => String(input))).toEqual([
      "https://api.example.com/copilot/api/v1/tasks",
      "https://api.example.com/copilot/api/v1/tasks/task-1/events",
      "https://api.example.com/copilot/api/v1/tasks/task-1/messages?size=100&sort=createdAt%2Cdesc",
      "https://api.example.com/copilot/api/v1/tasks/task-1/inputs",
    ])
    expect(requestAt(fetch, 1).init).toMatchObject({
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        Authorization: "Bearer secret-access-token",
        "X-App-Id": "app/one",
      },
    })
    expect(requestAt(fetch, 3).init.body).toBe(
      JSON.stringify({ type: "message", content: "Build the report" }),
    )
    session.close()
    await vi.waitFor(() => expect(eventStreamCancelled).toBe(true))
  })

  it("rejects WebSocket Agent sessions before making a request", () => {
    const fetch = mockFetch()
    const client = createClient({ ...config, fetch })

    expect(() => client.agentTasks.session({ taskId: "task-1", transport: "websocket" })).toThrow(
      "WebSocket Agent sessions are not available",
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it("uses the Messenger transport with a protected request body", async () => {
    const fetch = mockFetch(new Response(null, { status: 204 }))
    const client = createClient({ ...config, fetch })

    await client.messenger.notify("Build completed")

    expect(requestAt(fetch).url).toBe("https://api.example.com/messenger/api/v1/messages/notify")
    expect(requestAt(fetch).init).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer secret-access-token",
        "X-App-Id": "app/one",
      },
      body: JSON.stringify({ content: "Build completed" }),
    })
  })

  it("executes public Functions synchronously without protected headers", async () => {
    const fetch = mockFetch(json({ success: true, output: { ok: true }, error: null }))
    const client = createClient({ ...config, fetch })

    await client.publicFunctions.execute("function/1", { value: 1 })

    expect(requestAt(fetch).url).toBe(
      "https://api.example.com/functions/public/v1/functions/function%2F1/execute",
    )
    expect(requestAt(fetch).init).toMatchObject({
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Invocation-Type": "sync",
      },
      body: JSON.stringify({ input: { value: 1 } }),
    })
    expect(requestAt(fetch).init.headers).not.toHaveProperty("Authorization")
    expect(requestAt(fetch).init.headers).not.toHaveProperty("X-App-Id")
  })

  it("executes public Functions asynchronously without protected headers", async () => {
    const fetch = mockFetch(json({ id: "execution-1", status: "PENDING" }, 202))
    const client = createClient({ ...config, fetch })

    await client.publicFunctions.executeAsync("function-1")

    expect(requestAt(fetch).url).toBe(
      "https://api.example.com/functions/public/v1/functions/function-1/execute",
    )
    expect(requestAt(fetch).init).toMatchObject({
      method: "POST",
      headers: {
        "X-Invocation-Type": "async",
      },
      body: JSON.stringify({ input: {} }),
    })
    expect(requestAt(fetch).init.headers).not.toHaveProperty("Authorization")
    expect(requestAt(fetch).init.headers).not.toHaveProperty("X-App-Id")
  })

  it("polls public Function executions without protected headers", async () => {
    const fetch = mockFetch(
      json({ id: "execution-1", status: "SUCCESS", output: { ok: true }, error: null }),
    )
    const client = createClient({ ...config, fetch })

    await client.publicFunctions.getExecution("execution/1")

    expect(requestAt(fetch).url).toBe(
      "https://api.example.com/functions/public/v1/functions/executions/execution%2F1",
    )
    expect(requestAt(fetch).init).toMatchObject({ method: "GET" })
    expect(requestAt(fetch).init.headers).not.toHaveProperty("Authorization")
    expect(requestAt(fetch).init.headers).not.toHaveProperty("X-App-Id")
  })

  it("keeps native calls direct to services instead of the legacy BFF", async () => {
    const fetch = mockFetch(json({ content: [], totalElements: 0 }))
    const client = createClient({ ...config, fetch })

    await client.workflows.list({ page: 1 })

    expect(requestAt(fetch).url).toBe("https://api.example.com/functions/api/v1/workflows?page=1")
    expect(requestAt(fetch).url).not.toContain("/bff/")
  })
})

describe("app-scoped Code Studio access", () => {
  it.each([
    ["get", (client: ReturnType<typeof createClient>) => client.apps.get("other-app")],
    ["delete", (client: ReturnType<typeof createClient>) => client.apps.delete("other-app")],
    [
      "update",
      (client: ReturnType<typeof createClient>) =>
        client.apps.update("other-app", { name: "Other" }),
    ],
    ["getFiles", (client: ReturnType<typeof createClient>) => client.apps.getFiles("other-app")],
    [
      "replaceFiles",
      (client: ReturnType<typeof createClient>) => client.apps.replaceFiles("other-app", {}),
    ],
    [
      "mergeFiles",
      (client: ReturnType<typeof createClient>) => client.apps.mergeFiles("other-app", {}),
    ],
    ["build", (client: ReturnType<typeof createClient>) => client.apps.build("other-app")],
    ["publish", (client: ReturnType<typeof createClient>) => client.apps.publish("other-app")],
    [
      "getDeploy",
      (client: ReturnType<typeof createClient>) => client.apps.getDeploy("other-app", "deploy-1"),
    ],
    [
      "getCurrentDeploy",
      (client: ReturnType<typeof createClient>) => client.apps.getCurrentDeploy("other-app"),
    ],
    [
      "cancelBuild",
      (client: ReturnType<typeof createClient>) => client.apps.cancelBuild("other-app", "deploy-1"),
    ],
    [
      "rollback",
      (client: ReturnType<typeof createClient>) => client.apps.rollback("other-app", "version-1"),
    ],
    [
      "listDeploys",
      (client: ReturnType<typeof createClient>) => client.apps.listDeploys("other-app"),
    ],
    [
      "listVersions",
      (client: ReturnType<typeof createClient>) => client.apps.listVersions("other-app"),
    ],
  ] as const)("rejects %s for another app before making a request", async (_name, operation) => {
    const fetch = mockFetch()
    const client = createClient({ ...config, fetch })

    await expect(operation(client)).rejects.toThrow("Code Studio access is fixed to app app/one")
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    ["list", (client: ReturnType<typeof createClient>) => client.apps.list()],
    [
      "create",
      (client: ReturnType<typeof createClient>) => client.apps.create({ name: "Another app" }),
    ],
  ] as const)(
    "rejects the tenant-level %s operation before making a request",
    async (_name, operation) => {
      const fetch = mockFetch()
      const client = createClient({ ...config, fetch })

      await expect(operation(client)).rejects.toThrow(
        "is not available in an app-scoped Functions runtime",
      )
      expect(fetch).not.toHaveBeenCalled()
    },
  )

  it("rejects a mismatched app context before making a request", async () => {
    const fetch = mockFetch()
    const client = createClient({ ...config, fetch })

    await expect(client.context.getAppContext("other-app")).rejects.toThrow(
      "Code Studio access is fixed to app app/one",
    )
    expect(fetch).not.toHaveBeenCalled()
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
  it("accepts empty successful responses for 200 and 202 void operations", async () => {
    const fetch = mockFetch(
      new Response(null, { status: 200 }),
      new Response(null, { status: 202 }),
    )
    const client = createClient({ ...config, fetch })

    await expect(client.functionsAdmin.delete("function-1")).resolves.toBeUndefined()
    await expect(
      client.agentTasks.sendInput("task-1", { type: "interrupt" }),
    ).resolves.toBeUndefined()
  })

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
      message: "Mitra request timed out",
      status: 0,
      code: "REQUEST_TIMEOUT",
      retryable: true,
    })
  })
})
