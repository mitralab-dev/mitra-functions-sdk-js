import type { QueryParamValue, Transport, TransportRequestOptions } from "@mitralab.io/sdk-core"
import { MitraApiError } from "./errors"
import type { Fetch } from "./types"

interface BaseHttpClientConfig {
  baseUrl: string
  timeoutMs: number
  fetch: Fetch
}

type HttpClientConfig = BaseHttpClientConfig &
  (
    | { authentication: "bearer"; accessToken: string; appId: string }
    | { authentication: "anonymous" }
  )

type ErrorPayload = Record<string, unknown>

const bearerCredentialPattern = /(\bBearer\s+)\S+/gi

export function redactText(value: string, accessToken?: string): string {
  const bearerRedacted = value.replace(bearerCredentialPattern, "$1[REDACTED]")
  return accessToken ? bearerRedacted.split(accessToken).join("[REDACTED]") : bearerRedacted
}

function redactDetails(value: unknown, accessToken?: string): unknown {
  if (typeof value === "string") return redactText(value, accessToken)
  if (Array.isArray(value)) return value.map((item) => redactDetails(item, accessToken))
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => {
        const sensitive = /token|authorization|password|secret|api.?key/i.test(key)
        return [
          redactText(key, accessToken),
          sensitive ? "[REDACTED]" : redactDetails(entry, accessToken),
        ]
      }),
    )
  }
  return value
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined
}

function appendQueryParameters(url: URL, params: Record<string, QueryParamValue>): void {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue
    const values = Array.isArray(value) ? value : [value]
    for (const item of values) {
      url.searchParams.append(key, typeof item === "string" ? item : item.toString())
    }
  }
}

function createRequestHeaders(
  hasBody: boolean,
  customHeaders: Record<string, string> | undefined,
  authentication: { type: "bearer"; accessToken: string; appId: string } | { type: "anonymous" },
): Record<string, string> {
  const safeCustomHeaders = Object.fromEntries(
    Object.entries(customHeaders ?? {}).filter(
      ([name]) => !["authorization", "x-app-id"].includes(name.toLowerCase()),
    ),
  )
  return {
    Accept: "application/json",
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
    ...safeCustomHeaders,
    ...(authentication.type === "bearer"
      ? {
          Authorization: `Bearer ${authentication.accessToken}`,
          "X-App-Id": authentication.appId,
        }
      : {}),
  }
}

async function parsePayload(response: Response): Promise<unknown> {
  const text = await response.text()
  if (response.ok && !text.trim()) return undefined
  try {
    return JSON.parse(text)
  } catch {
    if (response.ok) {
      throw new MitraApiError("The Mitra API returned invalid JSON", response.status, {
        code: "INVALID_RESPONSE",
        retryable: false,
      })
    }
    return {}
  }
}

export function createApiError(
  response: Response,
  payload: unknown,
  accessToken?: string,
): MitraApiError {
  const errorPayload: ErrorPayload =
    payload && typeof payload === "object" ? (payload as ErrorPayload) : {}
  const rawMessage = optionalString(errorPayload.message)
  const message = redactText(
    rawMessage ?? `Request failed with status ${response.status}`,
    accessToken,
  )
  const rawRequestId =
    optionalString(errorPayload.request_id) ??
    optionalString(errorPayload.requestId) ??
    response.headers.get("X-Request-Id") ??
    undefined
  const rawCode = optionalString(errorPayload.error_code) ?? optionalString(errorPayload.code)
  const requestId = rawRequestId === undefined ? undefined : redactText(rawRequestId, accessToken)
  const code = rawCode === undefined ? undefined : redactText(rawCode, accessToken)
  const retryable =
    typeof errorPayload.retryable === "boolean" ? errorPayload.retryable : response.status >= 500

  return new MitraApiError(message, response.status, {
    ...(code === undefined ? {} : { code }),
    ...(errorPayload.details === undefined
      ? {}
      : { details: redactDetails(errorPayload.details, accessToken) }),
    ...(requestId === undefined ? {} : { requestId }),
    ...(retryable === undefined ? {} : { retryable }),
  })
}

export class HttpClient implements Transport {
  readonly #authentication: HttpClientConfig["authentication"]
  readonly #accessToken: string | undefined

  private readonly baseUrl: string
  private readonly appId: string | undefined
  private readonly timeoutMs: number
  private readonly fetchImplementation: Fetch

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl
    this.#authentication = config.authentication
    this.#accessToken = config.authentication === "bearer" ? config.accessToken : undefined
    this.appId = config.authentication === "bearer" ? config.appId : undefined
    this.timeoutMs = config.timeoutMs
    this.fetchImplementation = config.fetch
  }

  async request<T>(path: string, options: TransportRequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`)
    appendQueryParameters(url, options.params ?? {})

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    const hasBody = options.body !== undefined
    const authentication =
      this.#authentication === "bearer"
        ? {
            type: "bearer" as const,
            accessToken: this.#accessToken!,
            appId: this.appId!,
          }
        : { type: "anonymous" as const }

    try {
      const response = await this.fetchImplementation(url, {
        method: options.method ?? "GET",
        headers: createRequestHeaders(hasBody, options.headers, authentication),
        ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
        redirect: "manual",
        signal: controller.signal,
      })

      if (response.status === 204) return undefined as T

      const payload = await parsePayload(response)
      if (!response.ok) throw createApiError(response, payload, this.#accessToken)

      return payload as T
    } catch (error) {
      if (error instanceof MitraApiError) throw error
      if (controller.signal.aborted) {
        throw new MitraApiError("Mitra request timed out", 0, {
          code: "REQUEST_TIMEOUT",
          retryable: true,
        })
      }
      throw new MitraApiError("The Mitra API request failed", 0, {
        code: "NETWORK_ERROR",
        retryable: true,
      })
    } finally {
      clearTimeout(timeout)
    }
  }

  get<T>(path: string, params?: Record<string, QueryParamValue>): Promise<T> {
    return this.request<T>(path, { method: "GET", ...(params === undefined ? {} : { params }) })
  }

  post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(path, {
      method: "POST",
      ...(body === undefined ? {} : { body }),
      ...(headers === undefined ? {} : { headers }),
    })
  }

  put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, { method: "PUT", body })
  }

  delete<T>(path: string, params?: Record<string, QueryParamValue>): Promise<T> {
    return this.request<T>(path, {
      method: "DELETE",
      ...(params === undefined ? {} : { params }),
    })
  }
}
