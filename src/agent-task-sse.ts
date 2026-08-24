import {
  encodePathSegment,
  type AgentTaskEvent,
  type AgentTaskEventConnection,
  type AgentTaskEventObserver,
  type AgentTaskEventSource,
  type AgentSessionTransport,
  type SdkCoreErrorFactory,
} from "@mitralab.io/sdk-core"
import { MitraApiError, MitraConfigurationError } from "./errors"
import { createApiError } from "./http-client"
import type { Fetch } from "./types"

interface AgentTaskSseEventSourceConfig {
  baseUrl: string
  accessToken: string
  appId: string
  timeoutMs?: number
  fetch: Fetch
  errors: SdkCoreErrorFactory
}

function invalidResponse(message: string): MitraApiError {
  return new MitraApiError(message, 200, {
    code: "INVALID_RESPONSE",
    retryable: false,
  })
}

function parseAgentTaskEvent(data: string): AgentTaskEvent {
  let value: unknown
  try {
    value = JSON.parse(data)
  } catch {
    throw invalidResponse("The Agent event stream returned invalid JSON")
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw invalidResponse("The Agent event stream returned an invalid event")
  }
  const event = value as Record<string, unknown>
  if (typeof event.type !== "string" || typeof event.timestamp !== "number") {
    throw invalidResponse("The Agent event stream returned an invalid event")
  }
  if (event.sequence !== undefined && typeof event.sequence !== "number") {
    throw invalidResponse("The Agent event stream returned an invalid event sequence")
  }

  return value as AgentTaskEvent
}

function consumeEventBlock(block: string, observer: AgentTaskEventObserver): void {
  let eventName = "message"
  const data: string[] = []

  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.replace(/^\uFEFF/, "")
    if (!line || line.startsWith(":")) continue
    const separator = line.indexOf(":")
    const field = separator === -1 ? line : line.slice(0, separator)
    let value = separator === -1 ? "" : line.slice(separator + 1)
    if (value.startsWith(" ")) value = value.slice(1)
    if (field === "event") eventName = value
    if (field === "data") data.push(value)
  }

  if (eventName === "hello" || eventName === "ping") return
  if (eventName !== "message" || data.length === 0) return
  observer.onEvent(parseAgentTaskEvent(data.join("\n")))
}

async function readErrorPayload(response: Response): Promise<unknown> {
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch {
    return {}
  }
}

export class AgentTaskSseEventSource implements AgentTaskEventSource {
  constructor(private readonly config: AgentTaskSseEventSourceConfig) {}

  async open(
    taskId: string,
    observer: AgentTaskEventObserver,
    signal?: AbortSignal,
    transport?: AgentSessionTransport,
  ): Promise<AgentTaskEventConnection> {
    if (transport === "websocket") {
      throw new MitraConfigurationError(
        "WebSocket Agent sessions are not available in the Functions runtime",
      )
    }
    if (signal?.aborted) throw signal.reason ?? new Error("Agent event stream was aborted")

    const controller = new AbortController()
    let handshakeTimedOut = false
    let intentionallyClosed = false
    let disconnected = false
    const abortFromCaller = () => controller.abort(signal?.reason)
    signal?.addEventListener("abort", abortFromCaller, { once: true })
    const handshakeTimeout =
      this.config.timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            handshakeTimedOut = true
            controller.abort()
          }, this.config.timeoutMs)

    const disconnect = (error?: unknown) => {
      if (disconnected || intentionallyClosed) return
      disconnected = true
      observer.onDisconnect(error)
    }
    const cleanup = () => signal?.removeEventListener("abort", abortFromCaller)

    let response: Response
    try {
      const path = encodePathSegment(taskId, "taskId", this.config.errors)
      response = await this.config.fetch(`${this.config.baseUrl}/api/v1/tasks/${path}/events`, {
        method: "GET",
        headers: {
          Accept: "text/event-stream",
          Authorization: `Bearer ${this.config.accessToken}`,
          "X-App-Id": this.config.appId,
        },
        redirect: "manual",
        signal: controller.signal,
      })
    } catch {
      if (handshakeTimeout !== undefined) clearTimeout(handshakeTimeout)
      cleanup()
      if (handshakeTimedOut) {
        throw new MitraApiError("Mitra Agent event stream handshake timed out", 0, {
          code: "REQUEST_TIMEOUT",
          retryable: true,
        })
      }
      if (signal?.aborted) throw signal.reason ?? new Error("Agent event stream was aborted")
      throw new MitraApiError("The Mitra Agent event stream request failed", 0, {
        code: "NETWORK_ERROR",
        retryable: true,
      })
    }
    if (handshakeTimeout !== undefined) clearTimeout(handshakeTimeout)

    if (!response.ok) {
      cleanup()
      throw createApiError(response, await readErrorPayload(response), this.config.accessToken)
    }
    if (!response.body) {
      cleanup()
      throw invalidResponse("The Agent event stream response has no body")
    }
    const contentType = response.headers.get("Content-Type") ?? ""
    if (!contentType.toLowerCase().includes("text/event-stream")) {
      controller.abort()
      cleanup()
      throw invalidResponse("The Agent event stream returned an invalid content type")
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""

    void (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          let boundary = /\r?\n\r?\n/.exec(buffer)
          while (boundary?.index !== undefined) {
            consumeEventBlock(buffer.slice(0, boundary.index), observer)
            buffer = buffer.slice(boundary.index + boundary[0].length)
            boundary = /\r?\n\r?\n/.exec(buffer)
          }
        }
        buffer += decoder.decode()
        if (buffer.trim()) consumeEventBlock(buffer, observer)
        disconnect()
      } catch (error) {
        if (!controller.signal.aborted) {
          controller.abort()
          await reader.cancel().catch(() => undefined)
          disconnect(error)
        }
      } finally {
        cleanup()
        reader.releaseLock()
      }
    })()

    return {
      close() {
        if (intentionallyClosed) return
        intentionallyClosed = true
        cleanup()
        controller.abort()
        void reader.cancel().catch(() => undefined)
      },
    }
  }
}
