import type { QueryParamValue, Transport, TransportRequestOptions } from "@mitralab.io/sdk-core"
import { MitraApiError } from "./errors"
import type { Fetch } from "./types"

interface HttpClientConfig {
  baseUrl: string
  accessToken: string
  appId: string
  timeoutMs: number
  fetch: Fetch
}

type ErrorPayload = Record<string, unknown>

const bearerCredentialPattern = /(\bBearer\s+)\S+/gi

function redactText(value: string, accessToken: string): string {
  return value
    .replace(bearerCredentialPattern, "$1[REDACTED]")
    .split(accessToken)
    .join("[REDACTED]")
}

function redactDetails(value: unknown, accessToken: string): unknown {
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

export class HttpClient implements Transport {
  readonly #accessToken: string

  private readonly baseUrl: string
  private readonly appId: string
  private readonly timeoutMs: number
  private readonly fetchImplementation: Fetch

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl
    this.#accessToken = config.accessToken
    this.appId = config.appId
    this.timeoutMs = config.timeoutMs
    this.fetchImplementation = config.fetch
  }

  async request<T>(path: string, options: TransportRequestOptions = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`)
    for (const [key, value] of Object.entries(options.params ?? {})) {
      if (value !== undefined) url.searchParams.append(key, String(value))
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    const hasBody = options.body !== undefined

    try {
      const response = await this.fetchImplementation(url, {
        method: options.method ?? "GET",
        headers: {
          Accept: "application/json",
          ...(hasBody ? { "Content-Type": "application/json" } : {}),
          Authorization: `Bearer ${this.#accessToken}`,
          "X-App-Id": this.appId,
          ...options.headers,
        },
        ...(hasBody ? { body: JSON.stringify(options.body) } : {}),
        redirect: "manual",
        signal: controller.signal,
      })

      if (response.status === 204) return undefined as T

      const text = await response.text()
      let payload: unknown
      try {
        payload = JSON.parse(text)
      } catch {
        if (response.ok) {
          throw new MitraApiError("The Mitra API returned invalid JSON", response.status, {
            code: "INVALID_RESPONSE",
            retryable: false,
          })
        }
        payload = {}
      }

      if (!response.ok) {
        const errorPayload: ErrorPayload =
          payload && typeof payload === "object" ? (payload as ErrorPayload) : {}
        const rawMessage = optionalString(errorPayload.message)
        const message = redactText(
          rawMessage ?? `Request failed with status ${response.status}`,
          this.#accessToken,
        )
        const rawRequestId =
          optionalString(errorPayload.request_id) ??
          optionalString(errorPayload.requestId) ??
          response.headers.get("X-Request-Id") ??
          undefined
        const rawCode = optionalString(errorPayload.error_code) ?? optionalString(errorPayload.code)
        const requestId =
          rawRequestId === undefined ? undefined : redactText(rawRequestId, this.#accessToken)
        const code = rawCode === undefined ? undefined : redactText(rawCode, this.#accessToken)
        const retryable =
          typeof errorPayload.retryable === "boolean"
            ? errorPayload.retryable
            : response.status >= 500

        throw new MitraApiError(message, response.status, {
          ...(code === undefined ? {} : { code }),
          ...(errorPayload.details === undefined
            ? {}
            : { details: redactDetails(errorPayload.details, this.#accessToken) }),
          ...(requestId === undefined ? {} : { requestId }),
          ...(retryable === undefined ? {} : { retryable }),
        })
      }

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
