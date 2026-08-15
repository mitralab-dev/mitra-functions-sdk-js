import { MitraConfigurationError } from "./errors"
import type { Fetch, MitraClientConfig, MitraEnvironment } from "./types"

export const DEFAULT_TIMEOUT_MS = 10_000

export interface ResolvedMitraClientConfig {
  apiUrl: string
  accessToken: string
  appId: string
  dataSourceId?: string
  timeoutMs: number
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
  return parsed.toString().replace(/\/+$/, "")
}

export function resolveConfig(
  config: MitraClientConfig = {},
  environment: MitraEnvironment = readDefaultEnvironment(),
): ResolvedMitraClientConfig {
  const apiUrl = normalizeApiUrl(
    requiredValue(config.apiUrl ?? environment.MITRA_API_URL, "apiUrl"),
  )
  const accessToken = requiredValue(
    config.accessToken ?? environment.MITRA_PLATFORM_ACCESS_TOKEN,
    "accessToken",
  )
  const appId = requiredValue(config.appId ?? environment.MITRA_APP_ID, "appId")
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const fetchImplementation = config.fetch ?? globalThis.fetch

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
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
    accessToken,
    appId,
    ...(dataSourceId === undefined ? {} : { dataSourceId: dataSourceId.trim() }),
    timeoutMs,
    fetch: fetchImplementation,
  }
}
