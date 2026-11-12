import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createClient } from "./index"
import type { Fetch, FileMetadata } from "./index"

const fileId = "00000000-0000-4000-8000-000000000001"
const key = "00000000-0000-4000-8000-000000000002"
const nextKey = "00000000-0000-4000-8000-000000000003"
const partHash = createHash("sha256").update("abc").digest()
const staged: FileMetadata = {
  fileId,
  name: "report.txt",
  contentType: "text/plain",
  size: 3,
  state: "STAGED",
  pendingExpiresAt: "2030-01-01T00:00:00Z",
  checksum: {
    algorithm: "SHA256",
    type: "COMPOSITE",
    value: `${createHash("sha256").update(partHash).digest("base64")}-1`,
    partSize: 5 * 1024 * 1024,
    partCount: 1,
  },
}
const ready: FileMetadata = { ...staged, state: "READY", pendingExpiresAt: null }
const context = { actor: { id: "authenticated-user" } }
const event = { messageId: "message-1", fileId: "untrusted-file", idempotencyKey: key }
const headings = {
  confirm: "Confirmar e retomar um vínculo pendente",
  read: "Autorizar leitura",
  delete: "Autorizar exclusão",
}
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8")

function example(action: keyof typeof headings) {
  const authorizeAttachment = vi.fn().mockResolvedValue({ fileId })
  const markAttachmentReady = vi.fn().mockResolvedValue(undefined)
  const policy = { authorizeAttachment, markAttachmentReady }
  const code = readme
    .split(`### ${headings[action]}\n`)[1]
    ?.split("\n### ")[0]
    ?.match(/```javascript\n([\s\S]*?)\n```/)?.[1]
  if (!code) throw new Error(`Missing README example: ${action}`)
  const exports = {} as {
    handler: (event: Record<string, unknown>, context: unknown) => Promise<unknown>
  }
  runInNewContext(code, {
    exports,
    require(name: string) {
      if (name === "@mitralab.io/functions-sdk") return { createClient }
      if (name === "./file-policy") return policy
      throw new Error(`Unexpected example dependency: ${name}`)
    },
  })
  return { ...exports, ...policy }
}

beforeEach(() => {
  vi.stubEnv("MITRA_API_URL", "https://api.example.com")
  vi.stubEnv("MITRA_APP_ID", "app")
  vi.stubEnv("MITRA_PLATFORM_ACCESS_TOKEN", undefined)
  vi.stubEnv("MITRA_TOKEN", "execution-token")
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("README private file handlers", () => {
  it.each(["confirm", "read", "delete"] as const)(
    "refuses %s before contacting files when the consumer denies access",
    async (action) => {
      const fetch = vi.fn<Fetch>()
      vi.stubGlobal("fetch", fetch)
      const { handler, authorizeAttachment, markAttachmentReady } = example(action)
      authorizeAttachment.mockRejectedValue(new Error("Forbidden"))

      await expect(handler(event, context)).rejects.toThrow("Forbidden")
      expect(authorizeAttachment).toHaveBeenCalledWith(context, event.messageId, action)
      expect(fetch).not.toHaveBeenCalled()
      expect(markAttachmentReady).not.toHaveBeenCalled()
    },
  )

  it.each(["commit", "link persistence"])(
    "reconciles the pending link after a failed %s without publishing it early",
    async (failure) => {
      let metadata = staged
      const fetch = vi.fn<Fetch>().mockImplementation(async (_url, options) => {
        if (options?.method === "POST") {
          if (failure === "commit" && fetch.mock.calls.length === 2) {
            return Response.json({ code: "UNAVAILABLE" }, { status: 503 })
          }
          metadata = ready
        }
        return Response.json(metadata)
      })
      vi.stubGlobal("fetch", fetch)
      const { handler, authorizeAttachment, markAttachmentReady } = example("confirm")
      markAttachmentReady.mockImplementation(async () => {
        expect(metadata.state).toBe("READY")
        if (failure === "link persistence" && markAttachmentReady.mock.calls.length === 1) {
          throw new Error("Database unavailable")
        }
      })

      await expect(handler(event, context)).rejects.toThrow(
        failure === "commit" ? "File API request failed" : "Database unavailable",
      )
      expect(markAttachmentReady).toHaveBeenCalledTimes(failure === "commit" ? 0 : 1)
      await expect(handler(event, context)).resolves.toEqual({ fileId })
      expect(authorizeAttachment).toHaveBeenNthCalledWith(2, context, event.messageId, "confirm")
      expect(markAttachmentReady).toHaveBeenLastCalledWith({ fileId })
      expect(fetch.mock.calls.map(([url, options]) => [String(url), options?.method])).toEqual([
        [`https://api.example.com/data-manager/api/v1/files/${fileId}`, "GET"],
        [`https://api.example.com/data-manager/api/v1/files/${fileId}/commit`, "POST"],
        [`https://api.example.com/data-manager/api/v1/files/${fileId}`, "GET"],
        ...(failure === "commit"
          ? [[`https://api.example.com/data-manager/api/v1/files/${fileId}/commit`, "POST"]]
          : []),
      ])
    },
  )

  it("rechecks read authorization for replay and renewal and uses only the persisted file ID", async () => {
    const grant = { fileId, grantId: key, operation: "READ", expiresAt: "2030-01-01T00:00:00Z" }
    const fetch = vi.fn<Fetch>().mockImplementation(async (_url, options) => {
      return Response.json(options?.method === "POST" ? [grant] : ready)
    })
    vi.stubGlobal("fetch", fetch)
    const { handler, authorizeAttachment } = example("read")
    for (const idempotencyKey of [key, key, nextKey]) {
      await expect(handler({ ...event, idempotencyKey }, context)).resolves.toEqual(grant)
    }
    expect(authorizeAttachment.mock.calls).toEqual(
      Array(3).fill([context, event.messageId, "read"]),
    )
    const requests = fetch.mock.calls.filter(([, options]) => options?.method === "POST")
    expect(requests.map(([, options]) => options?.headers)).toEqual(
      [key, key, nextKey].map((idempotencyKey) =>
        expect.objectContaining({
          Authorization: "Bearer execution-token",
          "Idempotency-Key": idempotencyKey,
        }),
      ),
    )
    expect(requests.map(([, options]) => JSON.parse(options!.body as string))).toEqual(
      Array(3).fill({ fileIds: [fileId] }),
    )
  })

  it("does not issue a read grant for a staged file", async () => {
    const fetch = vi.fn<Fetch>().mockResolvedValue(Response.json(staged))
    vi.stubGlobal("fetch", fetch)
    await expect(example("read").handler(event, context)).rejects.toThrow("Attachment is not ready")
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("GET")
  })

  it("deletes only the attachment authorized by the consumer", async () => {
    const fetch = vi.fn<Fetch>().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetch)
    const { handler, authorizeAttachment } = example("delete")
    await expect(handler(event, context)).resolves.toBeUndefined()
    expect(authorizeAttachment).toHaveBeenCalledWith(context, event.messageId, "delete")
    expect(fetch.mock.calls.map(([url, options]) => [String(url), options?.method])).toEqual([
      [`https://api.example.com/data-manager/api/v1/files/${fileId}`, "DELETE"],
    ])
  })
})
