import { MitraConfigurationError } from "./errors"
import type { Fetch, MitraClientConfig, MitraEnvironment } from "./types"

export interface ResolvedMitraClientConfig {
  apiUrl: string
  legacyBaseUrl: string
  accessToken: string
  appId: string
  dataSourceId?: string
  timeoutMs?: number
  fetch: Fetch
}

function readDefaultEnvironment(): MitraEnvironment {
  return typeof process === "undefined" ? {} : process.env
}

function requiredValue(value: string | undefined, name: string): string {
  if (!value?.trim()) {
    throw new MitraConfigurationError(`${name} is required`)
  }
  return value.trim()
}

function removeTrailingSlashes(value: string): string {
  let end = value.length
  while (end > 0 && value.charCodeAt(end - 1) === 47) end -= 1
  return value.slice(0, end)
}

function normalizeApiUrl(value: string): string {
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new MitraConfigurationError("apiUrl must be a valid HTTP or HTTPS URL")
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new MitraConfigurationError("apiUrl must be a valid HTTP or HTTPS URL")
  }
  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    value.includes("?") ||
    value.includes("#")
  ) {
    throw new MitraConfigurationError(
      "apiUrl must not include credentials, query parameters, or a fragment",
    )
  }
  return removeTrailingSlashes(parsed.toString())
}

function deriveNativeApiUrl(legacyBaseUrl: string | undefined): string | undefined {
  if (legacyBaseUrl === undefined) return undefined

  const parsed = new URL(normalizeApiUrl(legacyBaseUrl))
  parsed.pathname = parsed.pathname.replace(/\/legacy\/?$/, "") || "/"
  return removeTrailingSlashes(parsed.toString())
}

export function resolveConfig(
  config: MitraClientConfig = {},
  environment: MitraEnvironment = readDefaultEnvironment(),
): ResolvedMitraClientConfig {
  const apiUrl = normalizeApiUrl(
    requiredValue(
      config.apiUrl ?? environment.MITRA_API_URL ?? deriveNativeApiUrl(environment.MITRA_BASE_URL),
      "apiUrl",
    ),
  )
  const accessToken = requiredValue(
    config.accessToken ?? environment.MITRA_PLATFORM_ACCESS_TOKEN ?? environment.MITRA_TOKEN,
    "accessToken",
  )
  const appId = requiredValue(
    config.appId ?? environment.MITRA_APP_ID ?? environment.MITRA_PROJECT_ID,
    "appId",
  )
  const timeoutMs = config.timeoutMs
  const fetchImplementation = config.fetch ?? globalThis.fetch

  if (timeoutMs !== undefined && (!Number.isFinite(timeoutMs) || timeoutMs <= 0)) {
    throw new MitraConfigurationError("timeoutMs must be a positive number")
  }
  if (typeof fetchImplementation !== "function") {
    throw new MitraConfigurationError("A fetch implementation is required")
  }

  const dataSourceId = config.dataSourceId ?? environment.MITRA_DATA_SOURCE_ID
  if (dataSourceId !== undefined && !dataSourceId.trim()) {
    throw new MitraConfigurationError("dataSourceId must not be empty when provided")
  }

  return {
    apiUrl,
    legacyBaseUrl: normalizeApiUrl(config.legacyBaseUrl ?? environment.MITRA_BASE_URL ?? apiUrl),
    accessToken,
    appId,
    ...(dataSourceId === undefined ? {} : { dataSourceId: dataSourceId.trim() }),
    ...(timeoutMs === undefined ? {} : { timeoutMs }),
    fetch: fetchImplementation,
  }
}
