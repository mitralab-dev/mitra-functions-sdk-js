import { inspect } from "node:util"
import { describe, expect, it, vi } from "vitest"
import type { AgentTaskEvent, SdkCoreErrorFactory } from "@mitralab.io/sdk-core"
import { AgentTaskSseEventSource } from "./agent-task-sse"
import { MitraApiError, MitraConfigurationError } from "./errors"
import type { Fetch } from "./types"

const errors: SdkCoreErrorFactory = {
  configuration: (message) => new MitraConfigurationError(message),
  invalidResponse: (message) =>
    new MitraApiError(message, 200, { code: "INVALID_RESPONSE", retryable: false }),
}

const config = {
  baseUrl: "https://api.example.com/copilot",
  accessToken: "secret-access-token",
  appId: "app/one",
  timeoutMs: 100,
  errors,
}

function source(fetch: Fetch, overrides: Partial<typeof config> = {}) {
  return new AgentTaskSseEventSource({ ...config, ...overrides, fetch })
}

function fragmentedSse(chunks: string[]): Response {
  const encoder = new TextEncoder()
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
        controller.close()
      },
    }),
    { status: 200, headers: { "Content-Type": "text/event-stream; charset=utf-8" } },
  )
}

describe("AgentTaskSseEventSource", () => {
  it("does not impose a handshake deadline unless one is configured", async () => {
    vi.useFakeTimers()
    const fetch = vi.fn<Fetch>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason))
        }),
    )
    const eventSource = new AgentTaskSseEventSource({
      baseUrl: config.baseUrl,
      accessToken: config.accessToken,
      appId: config.appId,
      errors,
      fetch,
    })
    const caller = new AbortController()
    const opening = eventSource.open(
      "task-1",
      { onEvent: vi.fn(), onDisconnect: vi.fn() },
      caller.signal,
    )

    await vi.advanceTimersByTimeAsync(60_000)

    expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(false)
    const reason = new Error("caller aborted")
    const assertion = expect(opening).rejects.toBe(reason)
    caller.abort(reason)
    await assertion
    vi.useRealTimers()
  })

  it("rejects an explicitly requested WebSocket transport", async () => {
    const fetch = vi.fn<Fetch>()

    await expect(
      source(fetch).open(
        "task-1",
        { onEvent: vi.fn(), onDisconnect: vi.fn() },
        undefined,
        "websocket",
      ),
    ).rejects.toBeInstanceOf(MitraConfigurationError)
    expect(fetch).not.toHaveBeenCalled()
  })

  it("authenticates a path-safe SSE request and parses fragmented hello, ping, and message events", async () => {
    const event: AgentTaskEvent = {
      type: "textDelta",
      payload: { text: "hello" },
      timestamp: 123,
    }
    const body = `event: hello\ndata: {}\n\nevent: ping\ndata: {}\n\nevent: message\ndata: ${JSON.stringify(event)}\n\n`
    const fetch = vi.fn<Fetch>(async () =>
      fragmentedSse([body.slice(0, 7), body.slice(7, 41), body.slice(41, 63), body.slice(63)]),
    )
    const events: AgentTaskEvent[] = []
    let resolveDisconnected!: () => void
    const disconnected = new Promise<void>((resolve) => {
      resolveDisconnected = resolve
    })

    await source(fetch).open("task/one", {
      onEvent: (received) => events.push(received),
      onDisconnect: () => resolveDisconnected(),
    })
    await disconnected

    expect(events).toEqual([event])
    expect(fetch).toHaveBeenCalledTimes(1)
    const [url, init] = fetch.mock.calls[0]!
    expect(String(url)).toBe("https://api.example.com/copilot/api/v1/tasks/task%2Fone/events")
    expect(String(url)).not.toContain(config.accessToken)
    expect(init).toMatchObject({
      method: "GET",
      redirect: "manual",
      headers: {
        Accept: "text/event-stream",
        Authorization: "Bearer secret-access-token",
        "X-App-Id": "app/one",
      },
    })
  })

  it("keeps the body alive beyond the handshake timeout and closes it only on close", async () => {
    vi.useFakeTimers()
    let cancelled = false
    const fetch = vi.fn<Fetch>(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("event: hello\ndata: {}\n\n"))
            },
            cancel() {
              cancelled = true
            },
          }),
          { headers: { "Content-Type": "text/event-stream" } },
        ),
    )
    const onDisconnect = vi.fn()

    const connection = await source(fetch, { timeoutMs: 5 }).open("task-1", {
      onEvent: vi.fn(),
      onDisconnect,
    })
    await vi.advanceTimersByTimeAsync(100)

    expect((fetch.mock.calls[0]![1] as RequestInit).signal?.aborted).toBe(false)
    connection.close()
    await Promise.resolve()
    expect((fetch.mock.calls[0]![1] as RequestInit).signal?.aborted).toBe(true)
    expect(onDisconnect).not.toHaveBeenCalled()
    expect(cancelled).toBe(true)
    vi.useRealTimers()
  })

  it("aborts a pending handshake at the configured timeout", async () => {
    vi.useFakeTimers()
    const fetch = vi.fn<Fetch>(
      (_input, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          )
        }),
    )

    const opening = source(fetch, { timeoutMs: 5 }).open("task-1", {
      onEvent: vi.fn(),
      onDisconnect: vi.fn(),
    })
    const assertion = expect(opening).rejects.toMatchObject({
      status: 0,
      code: "REQUEST_TIMEOUT",
      retryable: true,
    })
    await vi.advanceTimersByTimeAsync(5)
    await assertion
    vi.useRealTimers()
  })

  it("preserves the HTTP status and redacts credentials from handshake errors", async () => {
    const token = config.accessToken
    const fetch = vi.fn<Fetch>(
      async () =>
        new Response(
          JSON.stringify({
            message: `Rejected Bearer ${token}`,
            code: "UNAUTHORIZED",
            details: { accessToken: token, context: `Bearer ${token}` },
          }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
    )

    let error: unknown
    try {
      await source(fetch).open("task-1", { onEvent: vi.fn(), onDisconnect: vi.fn() })
    } catch (caught) {
      error = caught
    }

    expect(error).toBeInstanceOf(MitraApiError)
    expect(error).toMatchObject({ status: 401, code: "UNAUTHORIZED", retryable: false })
    expect(JSON.stringify(error)).not.toContain(token)
    expect(inspect(error, { depth: null, showHidden: true })).not.toContain(token)
  })

  it("cancels and aborts a still-open stream before reporting a malformed message", async () => {
    let cancelled = false
    const fetch = vi.fn<Fetch>(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode("event: message\ndata: {not-json}\n\n"))
            },
            cancel() {
              cancelled = true
            },
          }),
          { headers: { "Content-Type": "text/event-stream" } },
        ),
    )
    let resolveDisconnected!: (error: unknown) => void
    const disconnected = new Promise<unknown>((resolve) => {
      resolveDisconnected = resolve
    })

    await source(fetch).open("task-1", {
      onEvent: vi.fn(),
      onDisconnect: resolveDisconnected,
    })

    await expect(disconnected).resolves.toMatchObject({
      status: 200,
      code: "INVALID_RESPONSE",
      retryable: false,
    })
    expect(cancelled).toBe(true)
    expect((fetch.mock.calls[0]![1] as RequestInit).signal?.aborted).toBe(true)
  })
})
