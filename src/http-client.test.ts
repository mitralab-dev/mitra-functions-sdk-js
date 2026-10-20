import { describe, expect, it, vi } from "vitest"
import type { Fetch } from "./types"
import { HttpClient } from "./http-client"

function requestHeaders(fetch: ReturnType<typeof vi.fn<Fetch>>): Record<string, string> {
  const call = fetch.mock.calls[0]
  if (!call) throw new Error("Missing fetch call")
  return call[1]?.headers as Record<string, string>
}

describe("transport header boundaries", () => {
  it("does not impose a request deadline unless one is configured", async () => {
    const fetch = vi.fn<Fetch>(async () => new Response("{}", { status: 200 }))
    const client = new HttpClient({
      baseUrl: "https://api.example.com/iam",
      authentication: "bearer",
      accessToken: "runtime-token",
      appId: "runtime-app",
      fetch,
    })

    await client.request("/api/v1/auth/me")

    expect(fetch.mock.calls[0]?.[1]).not.toHaveProperty("signal")
  })

  it("serializes array query parameters as repeated keys", async () => {
    const fetch = vi.fn<Fetch>(async () => new Response("[]", { status: 200 }))
    const client = new HttpClient({
      baseUrl: "https://api.example.com/functions",
      authentication: "bearer",
      accessToken: "runtime-token",
      appId: "runtime-app",
      timeoutMs: 100,
      fetch,
    })

    await client.request("/api/v1/functions/schedules", {
      params: { ids: ["function-1", "function-2"] },
    })

    const url = new URL(String(fetch.mock.calls[0]?.[0]))
    expect(url.searchParams.getAll("ids")).toEqual(["function-1", "function-2"])
  })

  it("preserves runtime credentials against case-insensitive header overrides", async () => {
    const fetch = vi.fn<Fetch>(async () => new Response("{}", { status: 200 }))
    const client = new HttpClient({
      baseUrl: "https://api.example.com/functions",
      authentication: "bearer",
      accessToken: "runtime-token",
      appId: "runtime-app",
      timeoutMs: 100,
      fetch,
    })

    await client.request("/api/v1/example", {
      headers: {
        authorization: "Bearer attacker-token",
        "x-aPp-Id": "other-app",
      },
    })

    expect(requestHeaders(fetch)).toMatchObject({
      Authorization: "Bearer runtime-token",
      "X-App-Id": "runtime-app",
    })
    expect(Object.keys(requestHeaders(fetch))).not.toContain("authorization")
    expect(Object.keys(requestHeaders(fetch))).not.toContain("x-aPp-Id")
  })

  it("strips case-insensitive protected headers from anonymous requests", async () => {
    const fetch = vi.fn<Fetch>(async () => new Response("{}", { status: 200 }))
    const client = new HttpClient({
      baseUrl: "https://api.example.com/functions",
      authentication: "anonymous",
      timeoutMs: 100,
      fetch,
    })

    await client.request("/public/v1/example", {
      headers: {
        AUTHORIZATION: "Bearer attacker-token",
        "X-aPp-Id": "other-app",
        "X-Invocation-Type": "sync",
      },
    })

    expect(requestHeaders(fetch)).toMatchObject({ "X-Invocation-Type": "sync" })
    expect(
      Object.keys(requestHeaders(fetch)).some((name) => name.toLowerCase() === "authorization"),
    ).toBe(false)
    expect(
      Object.keys(requestHeaders(fetch)).some((name) => name.toLowerCase() === "x-app-id"),
    ).toBe(false)
  })
})

describe("token renewal", () => {
  function renewingClient(fetch: ReturnType<typeof vi.fn<Fetch>>, tokens: string[]) {
    let issued = 0
    return new HttpClient({
      baseUrl: "https://api.example.com/functions",
      authentication: "bearer",
      accessToken: tokens[0]!,
      appId: "runtime-app",
      tokenProvider: {
        get: () => Promise.resolve(tokens[Math.min(issued, tokens.length - 1)]!),
        invalidate: () => {
          issued += 1
        },
      },
      fetch,
    })
  }

  it("renews the token and retries once when a request comes back unauthorized", async () => {
    let attempts = 0
    const fetch = vi.fn<Fetch>(async () => {
      attempts += 1
      return attempts === 1
        ? new Response('{"message":"expired"}', { status: 401 })
        : new Response('{"ok":true}', { status: 200 })
    })
    const client = renewingClient(fetch, ["stale-token", "fresh-token"])

    await expect(client.request("/api/v1/functions")).resolves.toEqual({ ok: true })

    expect(fetch).toHaveBeenCalledTimes(2)
    const retryHeaders = fetch.mock.calls[1]?.[1]?.headers as Record<string, string>
    expect(retryHeaders.Authorization).toBe("Bearer fresh-token")
  })

  it("gives up after a single retry so a revoked key does not loop", async () => {
    const fetch = vi.fn<Fetch>(async () => new Response('{"message":"nope"}', { status: 401 }))
    const client = renewingClient(fetch, ["stale-token", "also-stale"])

    await expect(client.request("/api/v1/functions")).rejects.toMatchObject({ status: 401 })

    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it("does not retry a request that failed for a reason other than authentication", async () => {
    const fetch = vi.fn<Fetch>(async () => new Response('{"message":"boom"}', { status: 500 }))
    const client = renewingClient(fetch, ["token"])

    await expect(client.request("/api/v1/functions")).rejects.toMatchObject({ status: 500 })

    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it("leaves a client without a provider on its configured token", async () => {
    const fetch = vi.fn<Fetch>(async () => new Response('{"message":"expired"}', { status: 401 }))
    const client = new HttpClient({
      baseUrl: "https://api.example.com/functions",
      authentication: "bearer",
      accessToken: "runtime-token",
      appId: "runtime-app",
      fetch,
    })

    await expect(client.request("/api/v1/functions")).rejects.toMatchObject({ status: 401 })

    expect(fetch).toHaveBeenCalledTimes(1)
  })
})

describe("retry after", () => {
  const quotaBody = (extra: Record<string, unknown> = {}) =>
    JSON.stringify({
      error_code: "EMAIL_DAILY_QUOTA_EXCEEDED",
      message: "Daily email quota exceeded",
      ...extra,
    })

  function clientAnswering(response: Response) {
    return new HttpClient({
      baseUrl: "https://api.example.com/messenger",
      authentication: "bearer",
      accessToken: "runtime-token",
      appId: "runtime-app",
      fetch: vi.fn<Fetch>(async () => response),
    })
  }

  it("reads the wait from the body of a quota refusal", async () => {
    const client = clientAnswering(
      new Response(quotaBody({ retry_after_seconds: 3600 }), {
        status: 429,
        headers: { "Retry-After": "60" },
      }),
    )

    await expect(client.request("/api/v1/messages/send")).rejects.toMatchObject({
      name: "MitraApiError",
      status: 429,
      code: "EMAIL_DAILY_QUOTA_EXCEEDED",
      retryAfterSeconds: 3600,
    })
  })

  it("falls back to the Retry-After header in seconds", async () => {
    const client = clientAnswering(
      new Response(quotaBody(), { status: 429, headers: { "Retry-After": " 120 " } }),
    )

    await expect(client.request("/api/v1/messages/send")).rejects.toMatchObject({
      retryAfterSeconds: 120,
    })
  })

  it("uses the header when the body value is invalid", async () => {
    const client = clientAnswering(
      new Response(quotaBody({ retry_after_seconds: "soon" }), {
        status: 429,
        headers: { "Retry-After": "90" },
      }),
    )

    await expect(client.request("/api/v1/messages/send")).rejects.toMatchObject({
      retryAfterSeconds: 90,
    })
  })

  it.each([
    ["no header", {}, undefined],
    ["an HTTP-date header", {}, "Wed, 21 Oct 2026 07:28:00 GMT"],
    ["a fractional header", {}, "1.5"],
    ["a negative header", {}, "-1"],
    ["a negative body value", { retry_after_seconds: -1 }, undefined],
    ["a fractional body value", { retry_after_seconds: 1.5 }, undefined],
    ["a string body value", { retry_after_seconds: "60" }, undefined],
  ])("leaves the wait unset with %s", async (_case, extra, header) => {
    const client = clientAnswering(
      new Response(quotaBody(extra), {
        status: 429,
        headers: header === undefined ? {} : { "Retry-After": header },
      }),
    )

    const error = await client.request("/api/v1/messages/send").catch((reason: unknown) => reason)

    expect(error).toMatchObject({ status: 429 })
    expect(error).toHaveProperty("retryAfterSeconds", undefined)
  })
})
