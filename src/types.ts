export type Fetch = typeof globalThis.fetch

export interface MitraEnvironment {
  MITRA_API_URL?: string
  MITRA_PLATFORM_ACCESS_TOKEN?: string
  MITRA_APP_ID?: string
  MITRA_DATA_SOURCE_ID?: string
  /** Deprecated SDK base URL. Native calls never use it. */
  MITRA_BASE_URL?: string
  /** Deprecated SDK token. Native calls never use it. */
  MITRA_TOKEN?: string
  /** Deprecated SDK project id. Native calls never use it. */
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
  timeoutMs?: number
  fetch?: Fetch
}
