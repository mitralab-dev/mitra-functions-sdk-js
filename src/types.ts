import type { AgentWebSocketConstructor } from "@mitralab.io/sdk-core"

export type Fetch = typeof globalThis.fetch

export interface MitraEnvironment {
  MITRA_API_URL?: string
  MITRA_PLATFORM_ACCESS_TOKEN?: string
  /** Api key created in Settings -> API keys. Traded for a token by the SDK. */
  MITRA_API_KEY?: string
  MITRA_APP_ID?: string
  MITRA_DATA_SOURCE_ID?: string
  /** Existing Server Function base URL. Used to derive the native API root when needed. */
  MITRA_BASE_URL?: string
  /** Existing app-scoped Server Function token. */
  MITRA_TOKEN?: string
  /** Existing Server Function app identifier. */
  MITRA_PROJECT_ID?: string
  [key: string]: string | undefined
}

export interface MitraClientConfig {
  apiUrl?: string
  /** Optional BFF base URL used only to configure deprecated reexports. */
  legacyBaseUrl?: string
  accessToken?: string
  /** Api key created in Settings -> API keys, used by `createClientFromApiKey`. */
  apiKey?: string
  appId?: string
  dataSourceId?: string
  /** Optional request deadline. By default, the Functions runtime owns operation time limits. */
  timeoutMs?: number
  /**
   * fetch for the Mitra API calls, which carry the access token. The Agent box routes never use
   * it: they take `globalThis.fetch`, so a fetch that adds `Authorization` cannot hand the token
   * to the box.
   */
  fetch?: Fetch
  /**
   * WebSocket implementation for Agent sessions, such as `ws`, when the runtime has no global one.
   * Without either, Agent sessions reach the box over HTTP.
   */
  WebSocket?: AgentWebSocketConstructor
}
