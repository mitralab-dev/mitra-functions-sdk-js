export type Fetch = typeof globalThis.fetch

export interface MitraEnvironment {
  MITRA_API_URL?: string
  MITRA_PLATFORM_ACCESS_TOKEN?: string
  MITRA_APP_ID?: string
  MITRA_DATA_SOURCE_ID?: string
  [key: string]: string | undefined
}

export interface MitraClientConfig {
  apiUrl?: string
  accessToken?: string
  appId?: string
  dataSourceId?: string
  timeoutMs?: number
  fetch?: Fetch
}
