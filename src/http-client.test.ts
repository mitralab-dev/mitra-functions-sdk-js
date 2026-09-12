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
