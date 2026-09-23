import {
  createAgentTaskSessionManager,
  createSdkCore,
  encodePathSegment,
  expectObject,
  withAgentTaskSessions,
  type AuthModule,
  type SdkCore,
  type AgentTasksWithSessions,
} from "@mitralab.io/sdk-core"
import { AgentTaskSseEventSource } from "./agent-task-sse"
import {
  createAppScopedAppsModule,
  type AppScopedAppsModule,
  type CurrentAppModule,
} from "./app-scoped-apps"
import { createApiKeyTokenProvider } from "./api-key"
import { coreErrors } from "./core-errors"
import { resolveApiKeyOptions, resolveConfig } from "./config"
import type { ResolvedMitraClientConfig } from "./config"
import { MitraApiError } from "./errors"
import { HttpClient } from "./http-client"
import { configureLegacySdk } from "./legacy/configure"
import type { MitraClientConfig, MitraEnvironment } from "./types"

interface AppInfoResponse {
  dataSourceId: string | null
}

export interface MitraClient {
  init(): Promise<void>
  readonly agentConnections: SdkCore["agentConnections"]
  readonly agentCredentials: SdkCore["agentCredentials"]
  readonly agents: SdkCore["agents"]
  readonly agentTasks: AgentTasksWithSessions
  readonly apps: AppScopedAppsModule
  readonly auth: AuthModule
  readonly context: SdkCore["context"]
  readonly currentApp: CurrentAppModule
  readonly customQueries: SdkCore["customQueries"]
  readonly dataSources: SdkCore["dataSources"]
  readonly entities: SdkCore["entities"]
  readonly functions: SdkCore["functions"]
  readonly functionsAdmin: SdkCore["functionsAdmin"]
  readonly imports: SdkCore["imports"]
  readonly integration: SdkCore["integration"]
  readonly integrationAdmin: SdkCore["integrationAdmin"]
  readonly integrationResources: SdkCore["integrationResources"]
  readonly integrationTemplates: SdkCore["integrationTemplates"]
  readonly members: SdkCore["members"]
  readonly messenger: SdkCore["messenger"]
  readonly publicFunctions: SdkCore["publicFunctions"]
  readonly queries: SdkCore["queries"]
  readonly schema: SdkCore["schema"]
  readonly sql: SdkCore["sql"]
  readonly workflows: SdkCore["workflows"]
}

class DefaultMitraClient implements MitraClient {
  readonly agentConnections: SdkCore["agentConnections"]
  readonly agentCredentials: SdkCore["agentCredentials"]
  readonly agents: SdkCore["agents"]
  readonly agentTasks: AgentTasksWithSessions
  readonly apps: AppScopedAppsModule
  readonly auth: AuthModule
  readonly context: SdkCore["context"]
  readonly currentApp: CurrentAppModule
  readonly customQueries: SdkCore["customQueries"]
  readonly dataSources: SdkCore["dataSources"]
  readonly entities: SdkCore["entities"]
  readonly functions: SdkCore["functions"]
  readonly functionsAdmin: SdkCore["functionsAdmin"]
  readonly imports: SdkCore["imports"]
  readonly integration: SdkCore["integration"]
  readonly integrationAdmin: SdkCore["integrationAdmin"]
  readonly integrationResources: SdkCore["integrationResources"]
  readonly integrationTemplates: SdkCore["integrationTemplates"]
  readonly members: SdkCore["members"]
  readonly messenger: SdkCore["messenger"]
  readonly publicFunctions: SdkCore["publicFunctions"]
  readonly queries: SdkCore["queries"]
  readonly schema: SdkCore["schema"]
  readonly sql: SdkCore["sql"]
  readonly workflows: SdkCore["workflows"]

  #dataSourceId: string | undefined
  #initPromise: Promise<void> | undefined
  readonly #appId: string
  readonly #codeStudioHttpClient: HttpClient

  constructor(config: ResolvedMitraClientConfig) {
    this.#appId = config.appId
    this.#dataSourceId = config.dataSourceId

    const httpClient = (service: string) =>
      new HttpClient({
        baseUrl: `${config.apiUrl}/${service}`,
        authentication: "bearer",
        accessToken: config.accessToken,
        appId: config.appId,
        ...(config.tokenProvider === undefined ? {} : { tokenProvider: config.tokenProvider }),
        ...(config.timeoutMs === undefined ? {} : { timeoutMs: config.timeoutMs }),
        fetch: config.fetch,
      })

    const core = createSdkCore({
      transports: {
        auth: httpClient("iam"),
        codeStudio: httpClient("code-studio"),
        copilot: httpClient("copilot"),
        dataManager: httpClient("data-manager"),
        functions: httpClient("functions"),
        integration: httpClient("integration"),
        messenger: httpClient("messenger"),
        publicFunctions: new HttpClient({
          baseUrl: `${config.apiUrl}/functions`,
          authentication: "anonymous",
          ...(config.timeoutMs === undefined ? {} : { timeoutMs: config.timeoutMs }),
          fetch: config.fetch,
        }),
      },
      getAppId: () => this.#appId,
      functions: { executeInvocationType: "sync", emptyInput: "empty-object" },
      errors: coreErrors,
    })

    const appModules = createAppScopedAppsModule(core.apps, this.#appId)

    this.agentConnections = core.agentConnections
    this.agentCredentials = core.agentCredentials
    this.agents = core.agents
    this.agentTasks = withAgentTaskSessions(
      core.agentTasks,
      createAgentTaskSessionManager({
        tasks: core.agentTasks,
        eventSource: new AgentTaskSseEventSource({
          baseUrl: `${config.apiUrl}/copilot`,
          accessToken: config.accessToken,
          appId: config.appId,
          ...(config.timeoutMs === undefined ? {} : { timeoutMs: config.timeoutMs }),
          fetch: config.fetch,
          errors: coreErrors,
        }),
        // Core owns the channel to the box. Without a WebSocket, as in the Functions runtime on
        // Node 20, `auto` reaches the box over HTTP. The box routes use the global fetch, never
        // `config.fetch`: the grant in the channel URL is the box credential, and a custom fetch
        // that adds `Authorization` would send the Function token to the box.
        directChannel: {
          apiUrl: config.apiUrl,
          ...(config.WebSocket === undefined ? {} : { WebSocket: config.WebSocket }),
        },
      }),
    )
    this.apps = appModules.apps
    this.auth = core.auth
    this.context = core.context
    this.currentApp = appModules.currentApp
    this.customQueries = core.customQueries
    this.dataSources = core.dataSources
    this.entities = core.entities
    this.functions = core.functions
    this.functionsAdmin = core.functionsAdmin
    this.imports = core.imports
    this.integration = core.integration
    this.integrationAdmin = core.integrationAdmin
    this.integrationResources = core.integrationResources
    this.integrationTemplates = core.integrationTemplates
    this.members = core.members
    this.messenger = core.messenger
    this.publicFunctions = core.publicFunctions
    this.queries = core.queries
    this.schema = core.schema
    this.sql = core.sql
    this.workflows = core.workflows
    this.#codeStudioHttpClient = httpClient("code-studio")
  }

  init(): Promise<void> {
    if (this.#dataSourceId) return Promise.resolve()
    if (!this.#initPromise) {
      this.#initPromise = this.resolveDataSourceId().catch((error: unknown) => {
        this.#initPromise = undefined
        throw error
      })
    }
    return this.#initPromise
  }

  private async resolveDataSourceId(): Promise<void> {
    const appInfo = expectObject<AppInfoResponse>(
      await this.#codeStudioHttpClient.get<unknown>(
        `/api/v1/apps/${encodePathSegment(this.#appId, "appId", coreErrors)}/info`,
      ),
      "App info response",
      coreErrors,
    )
    if (appInfo.dataSourceId === null) return
    if (typeof appInfo.dataSourceId !== "string" || !appInfo.dataSourceId.trim()) {
      throw new MitraApiError("The app info response does not include a dataSourceId", 200, {
        code: "INVALID_RESPONSE",
        retryable: false,
      })
    }
    this.#dataSourceId = appInfo.dataSourceId
  }
}

function createConfiguredClient(config: ResolvedMitraClientConfig): MitraClient {
  configureLegacySdk(config)
  return new DefaultMitraClient(config)
}

export function createClient(config: MitraClientConfig = {}): MitraClient {
  return createConfiguredClient(resolveConfig(config))
}

export function createClientFromEnvironment(environment?: MitraEnvironment): MitraClient {
  return createConfiguredClient(resolveConfig({}, environment))
}

/**
 * Builds a client that authenticates with an api key instead of a token you already hold.
 *
 * The key is traded for a token here and again whenever that token ages out, so a process
 * that stays up for days keeps working. Reads `MITRA_API_KEY` when `apiKey` is omitted.
 */
export async function createClientFromApiKey(
  config: MitraClientConfig = {},
  environment?: MitraEnvironment,
): Promise<MitraClient> {
  const options = resolveApiKeyOptions(config, environment)
  const tokenProvider = createApiKeyTokenProvider(options)

  // The first token is resolved eagerly: a bad key should fail where the client is built,
  // not later inside an unrelated call. It also gives the deprecated legacy bridge, which
  // holds a token of its own, something valid to start from.
  const accessToken = await tokenProvider.get()

  return createConfiguredClient({
    ...resolveConfig({ ...config, accessToken, appId: options.appId }, environment),
    tokenProvider,
  })
}
