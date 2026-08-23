import { describe, expect, it, vi } from "vitest"
import type { Fetch } from "./types"
import { HttpClient } from "./http-client"

function requestHeaders(fetch: ReturnType<typeof vi.fn<Fetch>>): Record<string, string> {
  const call = fetch.mock.calls[0]
  if (!call) throw new Error("Missing fetch call")
  return call[1]?.headers as Record<string, string>
}

describe("transport header boundaries", () => {
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
