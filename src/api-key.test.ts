import { describe, expect, it, vi } from "vitest"

import { createApiKeyTokenProvider, exchangeApiKey } from "./api-key"
import { MitraApiError, MitraConfigurationError } from "./errors"
import type { Fetch } from "./types"

const API_URL = "https://mitra.example.com"
const APP_ID = "1181c821-aafa-4e6c-8e81-cc29970ced25"
const API_KEY = "chave-de-teste-nunca-real"

function jwt(payload: Record<string, unknown>): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value))
      .toString("base64")
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/, "")
  return `${encode({ alg: "HS512" })}.${encode(payload)}.assinatura`
}

function appToken(appId = APP_ID, expSeconds = Math.floor(Date.now() / 1000) + 172_800): string {
  return jwt({ token_use: "app", app_id: appId, exp: expSeconds })
}

function sessionToken(): string {
  return jwt({ token_use: "session", exp: Math.floor(Date.now() / 1000) + 172_800 })
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

function stubFetch(...responses: Response[]): { fetch: Fetch; calls: string[] } {
  const calls: string[] = []
  const queue = [...responses]
  const fetch = vi.fn((url: URL | RequestInfo) => {
    calls.push(String(url))
    const next = queue.shift()
    if (!next) throw new Error(`Unexpected request to ${String(url)}`)
    return Promise.resolve(next)
  }) as unknown as Fetch
  return { fetch, calls }
}

describe("exchangeApiKey", () => {
  it("uses the exchanged token directly when the key already carries the app", async () => {
    const token = appToken()
    const { fetch, calls } = stubFetch(jsonResponse({ accessToken: token }))

    const resolved = await exchangeApiKey({
      apiUrl: API_URL,
      apiKey: API_KEY,
      appId: APP_ID,
      fetch,
    })

    expect(resolved).toBe(token)
    expect(calls).toEqual([`${API_URL}/iam/api/v1/auth/exchange`])
  })

  it("issues the app token when the key exchanges into a workspace session", async () => {
    const issued = appToken()
    const { fetch, calls } = stubFetch(
      jsonResponse({ accessToken: sessionToken() }),
      jsonResponse({ accessToken: issued }),
    )

    const resolved = await exchangeApiKey({
      apiUrl: API_URL,
      apiKey: API_KEY,
      appId: APP_ID,
      fetch,
    })

    expect(resolved).toBe(issued)
    expect(calls[1]).toBe(`${API_URL}/iam/api/v1/auth/apps/${APP_ID}/access-token`)
  })

  it("refuses a key bound to another app instead of attempting an impossible call", async () => {
    const { fetch, calls } = stubFetch(
      jsonResponse({ accessToken: appToken("00000000-0000-0000-0000-000000000000") }),
    )

    await expect(
      exchangeApiKey({ apiUrl: API_URL, apiKey: API_KEY, appId: APP_ID, fetch }),
    ).rejects.toThrow(/belongs to app/i)
    expect(calls).toHaveLength(1)
  })

  it("keeps the key out of the error when the exchange is refused", async () => {
    const { fetch } = stubFetch(jsonResponse({ message: API_KEY }, 401))

    const failure = await exchangeApiKey({
      apiUrl: API_URL,
      apiKey: API_KEY,
      appId: APP_ID,
      fetch,
    }).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(MitraApiError)
    expect((failure as MitraApiError).status).toBe(401)
    expect(JSON.stringify(failure)).not.toContain(API_KEY)
    expect((failure as MitraApiError).message).not.toContain(API_KEY)
  })

  it("rejects a response without an access token", async () => {
    const { fetch } = stubFetch(jsonResponse({ tokenType: "Bearer" }))

    await expect(
      exchangeApiKey({ apiUrl: API_URL, apiKey: API_KEY, appId: APP_ID, fetch }),
    ).rejects.toBeInstanceOf(MitraApiError)
  })
})

describe("createApiKeyTokenProvider", () => {
  it("refuses an empty key", () => {
    const { fetch } = stubFetch()

    expect(() =>
      createApiKeyTokenProvider({ apiUrl: API_URL, apiKey: "   ", appId: APP_ID, fetch }),
    ).toThrow(MitraConfigurationError)
  })

  it("exchanges once and reuses the token while it is fresh", async () => {
    const { fetch, calls } = stubFetch(jsonResponse({ accessToken: appToken() }))
    const provider = createApiKeyTokenProvider({
      apiUrl: API_URL,
      apiKey: API_KEY,
      appId: APP_ID,
      fetch,
    })

    await provider.get()
    await provider.get()

    expect(calls).toHaveLength(1)
  })

  it("shares one exchange between concurrent callers", async () => {
    const { fetch, calls } = stubFetch(jsonResponse({ accessToken: appToken() }))
    const provider = createApiKeyTokenProvider({
      apiUrl: API_URL,
      apiKey: API_KEY,
      appId: APP_ID,
      fetch,
    })

    await Promise.all([provider.get(), provider.get(), provider.get()])

    expect(calls).toHaveLength(1)
  })

  it("exchanges again after the token is invalidated", async () => {
    const first = appToken()
    const second = appToken()
    const { fetch } = stubFetch(
      jsonResponse({ accessToken: first }),
      jsonResponse({ accessToken: second }),
    )
    const provider = createApiKeyTokenProvider({
      apiUrl: API_URL,
      apiKey: API_KEY,
      appId: APP_ID,
      fetch,
    })

    expect(await provider.get()).toBe(first)
    provider.invalidate()
    expect(await provider.get()).toBe(second)
  })

  it("exchanges again once the token is close to expiring", async () => {
    const nearlyExpired = appToken(APP_ID, Math.floor(Date.now() / 1000) + 60)
    const renewed = appToken()
    const { fetch, calls } = stubFetch(
      jsonResponse({ accessToken: nearlyExpired }),
      jsonResponse({ accessToken: renewed }),
    )
    const provider = createApiKeyTokenProvider({
      apiUrl: API_URL,
      apiKey: API_KEY,
      appId: APP_ID,
      fetch,
    })

    expect(await provider.get()).toBe(nearlyExpired)
    expect(await provider.get()).toBe(renewed)
    expect(calls).toHaveLength(2)
  })
})
