import {
  createAgentTaskSessionManager,
  createSdkCore,
  encodePathSegment,
  expectObject,
  withAgentTaskSessions,
  type AuthModule,
  type SdkCore,
  type SdkCoreErrorFactory,
  type AgentTasksWithSessions,
} from "@mitralab.io/sdk-core"
import { AgentTaskSseEventSource } from "./agent-task-sse"
import {
  createAppScopedContextModule,
  createAppScopedAppsModule,
  type AppScopedAppsModule,
  type CurrentAppModule,
} from "./app-scoped-apps"
import { resolveConfig } from "./config"
import type { ResolvedMitraClientConfig } from "./config"
import { MitraApiError, MitraConfigurationError } from "./errors"
import { HttpClient } from "./http-client"
import { configureLegacySdk } from "./legacy/configure"
import type { MitraClientConfig, MitraEnvironment } from "./types"

interface AppInfoResponse {
  dataSourceId: string | null
}

const coreErrors: SdkCoreErrorFactory = {
  configuration: (message) => new MitraConfigurationError(message),
  invalidResponse: (message) =>
    new MitraApiError(message, 200, { code: "INVALID_RESPONSE", retryable: false }),
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
        timeoutMs: config.timeoutMs,
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
          timeoutMs: config.timeoutMs,
          fetch: config.fetch,
        }),
      },
      getDataSourceId: () => this.#dataSourceId,
      getAppId: () => this.#appId,
      functions: { executeInvocationType: "sync", emptyInput: "empty-object" },
      errors: coreErrors,
    })

    const appModules = createAppScopedAppsModule(core.apps, this.#appId)

    this.agentConnections = core.agentConnections
    this.agentCredentials = core.agentCredentials
    this.agents = core.agents
    const agentSessionManager = createAgentTaskSessionManager({
      tasks: core.agentTasks,
      eventSource: new AgentTaskSseEventSource({
        baseUrl: `${config.apiUrl}/copilot`,
        accessToken: config.accessToken,
        appId: config.appId,
        timeoutMs: config.timeoutMs,
        fetch: config.fetch,
        errors: coreErrors,
      }),
    })
    this.agentTasks = withAgentTaskSessions(core.agentTasks, {
      session: (options) => {
        if (options.transport === "websocket") {
          throw new MitraConfigurationError(
            "WebSocket Agent sessions are not available in the Functions runtime; use http or auto",
          )
        }
        return agentSessionManager.session(options)
      },
    })
    this.apps = appModules.apps
    this.auth = core.auth
    this.context = createAppScopedContextModule(core.context, this.#appId)
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
