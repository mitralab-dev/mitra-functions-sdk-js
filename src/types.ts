export type Fetch = typeof globalThis.fetch

export interface MitraEnvironment {
  MITRA_API_URL?: string
  MITRA_PLATFORM_ACCESS_TOKEN?: string
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
  appId?: string
  dataSourceId?: string
  /** Optional request deadline. By default, the Functions runtime owns operation time limits. */
  timeoutMs?: number
  fetch?: Fetch
}
