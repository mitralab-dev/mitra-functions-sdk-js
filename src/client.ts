import {
  createSdkCore,
  encodePathSegment,
  expectObject,
  type AuthModule,
  type EntitiesProxy,
  type FunctionsModule,
  type IntegrationModule,
  type QueriesModule,
  type SdkCoreErrorFactory,
} from "@mitralab.io/sdk-core"
import { resolveConfig } from "./config"
import type { ResolvedMitraClientConfig } from "./config"
import { MitraApiError, MitraConfigurationError } from "./errors"
import { HttpClient } from "./http-client"
import type { MitraClientConfig, MitraEnvironment } from "./types"

interface AppInfoResponse {
  dataSourceId: string
}

const coreErrors: SdkCoreErrorFactory = {
  configuration: (message) => new MitraConfigurationError(message),
  invalidResponse: (message) =>
    new MitraApiError(message, 200, { code: "INVALID_RESPONSE", retryable: false }),
}

export interface MitraClient {
  init(): Promise<void>
  readonly auth: AuthModule
  readonly entities: EntitiesProxy
  readonly functions: FunctionsModule
  readonly integration: IntegrationModule
  readonly queries: QueriesModule
}

class DefaultMitraClient implements MitraClient {
  readonly auth: AuthModule
  readonly entities: EntitiesProxy
  readonly functions: FunctionsModule
  readonly integration: IntegrationModule
  readonly queries: QueriesModule

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
        accessToken: config.accessToken,
        appId: config.appId,
        timeoutMs: config.timeoutMs,
        fetch: config.fetch,
      })

    const core = createSdkCore({
      transports: {
        auth: httpClient("iam"),
        dataManager: httpClient("data-manager"),
        functions: httpClient("functions"),
        integration: httpClient("integration"),
      },
      getDataSourceId: () => this.#dataSourceId,
      functions: { executeInvocationType: "sync", emptyInput: "empty-object" },
      errors: coreErrors,
    })

    this.auth = core.auth
    this.entities = core.entities
    this.functions = core.functions
    this.integration = core.integration
    this.queries = core.queries
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
    if (!appInfo.dataSourceId?.trim()) {
      throw new MitraApiError("The app info response does not include a dataSourceId", 200, {
        code: "INVALID_RESPONSE",
        retryable: false,
      })
    }
    this.#dataSourceId = appInfo.dataSourceId
  }
}

export function createClient(config: MitraClientConfig = {}): MitraClient {
  return new DefaultMitraClient(resolveConfig(config))
}

export function createClientFromEnvironment(environment?: MitraEnvironment): MitraClient {
  return new DefaultMitraClient(resolveConfig({}, environment))
}
