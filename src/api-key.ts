import { readTokenExpiry, resolveApiKeyToken } from "@mitralab.io/sdk-core"

import { coreErrors } from "./core-errors"
import { MitraApiError, MitraConfigurationError } from "./errors"
import type { Fetch } from "./types"

/** Resolves the bearer token for each request, renewing it when it expires. */
export interface AccessTokenProvider {
  get(): Promise<string>
  invalidate(): void
}

export interface ApiKeyProviderOptions {
  apiUrl: string
  apiKey: string
  appId: string
  fetch: Fetch
}

// An api key exchange never returns a refresh token. The key is the durable credential and
// does not expire, so renewing means exchanging again instead of holding a second secret.
const EXPIRY_SKEW_MS = 5 * 60 * 1000

const IAM_BASE = "/iam"

/**
 * Trades an api key for a token that authorizes the configured app.
 *
 * Which calls that takes, and what the answers mean, is the shared IAM contract in
 * `@mitralab.io/sdk-core`. What belongs here is how this SDK reaches the network and what it
 * does with a refusal.
 */
export async function exchangeApiKey(options: ApiKeyProviderOptions): Promise<string> {
  const { apiUrl, apiKey, appId, fetch: fetchImplementation } = options

  return resolveApiKeyToken(
    async (path, init) => {
      const response = await fetchImplementation(new URL(`${apiUrl}${IAM_BASE}${path}`), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(init.bearer === undefined ? {} : { Authorization: `Bearer ${init.bearer}` }),
        },
        ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
        redirect: "manual",
      })

      if (!response.ok) {
        // The key must never reach a message, a log or an error report, so the upstream body
        // is dropped rather than forwarded.
        throw new MitraApiError(
          `Api key authentication failed with status ${response.status}`,
          response.status,
          {
            code: response.status === 401 ? "INVALID_CREDENTIALS" : "AUTHENTICATION_FAILED",
            retryable: response.status >= 500,
          },
        )
      }

      return response.json()
    },
    appId,
    apiKey,
    coreErrors,
  )
}

export function createApiKeyTokenProvider(options: ApiKeyProviderOptions): AccessTokenProvider {
  if (!options.apiKey.trim()) {
    throw new MitraConfigurationError("apiKey must not be empty")
  }

  let token: string | null = null
  let renewAfter = 0
  let pending: Promise<string> | null = null

  return {
    async get(): Promise<string> {
      if (token !== null && Date.now() < renewAfter) return token
      // One exchange serves every request that finds the token missing or stale.
      pending ??= exchangeApiKey(options)
        .then((fresh) => {
          const expiry = readTokenExpiry(fresh)
          token = fresh
          renewAfter = expiry === null ? Number.MAX_SAFE_INTEGER : expiry - EXPIRY_SKEW_MS
          return fresh
        })
        .finally(() => {
          pending = null
        })
      return pending
    },
    invalidate(): void {
      token = null
      renewAfter = 0
    },
  }
}

export function createStaticTokenProvider(accessToken: string): AccessTokenProvider {
  return {
    get: () => Promise.resolve(accessToken),
    invalidate: () => {},
  }
}
