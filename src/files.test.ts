import { createServer, type IncomingHttpHeaders, type Server, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"
import { inspect } from "node:util"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { FileTransferError, MitraApiError, createClient } from "./index"
import type { Fetch, FileMetadata, FileUpload } from "./index"

// One real HTTP server per test plays both the Mitra API and storage. The client fetch adds
// Authorization only where the transport set none, so a storage request that went through it
// would arrive with a credential. A new server per test is a new origin, so undici never hands
// a test a pooled socket the previous one left behind.

interface Received {
  method: string
  path: string
  headers: IncomingHttpHeaders
  body: Buffer
}

type Route = (request: Received, response: ServerResponse) => void

const token = "function-token-never-real"
const clientFetchToken = "client-fetch-token-never-real"
const appId = "app-1"
const fileId = "0b6f3c1e-8d2a-4c55-9a77-5f1e2d3c4b5a"
const signature = "5e1f".repeat(16)
const files = "/data-manager/api/v1/files"
const csv = "id,total\n1,10\n"

let server: Server
let origin: string
let routes: Record<string, Route>
const received: Received[] = []
const viaClientFetch: string[] = []

function reply(response: ServerResponse, status: number, body = "", headers = {}): void {
  response.writeHead(status, headers)
  response.end(body)
}

function json(body: unknown, status = 200): Route {
  return (_request, response) =>
    reply(response, status, JSON.stringify(body), { "content-type": "application/json" })
}

function storagePath(): string {
  return `/storage/files/app/tenant/t/app/${appId}/${fileId}`
}

function signedLink(): string {
  return (
    `${origin}${storagePath()}?X-Amz-Algorithm=AWS4-HMAC-SHA256` +
    "&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20261114%2Fsa-east-1%2Fs3%2Faws4_request" +
    `&X-Amz-Expires=300&X-Amz-Signature=${signature}`
  )
}

function pendingUpload(): FileUpload {
  return {
    fileId,
    uploadUrl: signedLink(),
    uploadMethod: "PUT",
    uploadHeaders: { "content-type": "text/csv", "if-none-match": "*" },
    expiresAt: "2026-11-14T12:05:00Z",
  }
}

function metadata(overrides: Partial<FileMetadata> = {}): FileMetadata {
  return {
    id: fileId,
    name: "orders-2026-10.csv",
    contentType: "text/csv",
    sizeBytes: csv.length,
    kind: "PERMANENT",
    visibility: "APP",
    status: "READY",
    ownerUserId: null,
    createdBy: "FUNCTION",
    createdAt: "2026-11-14T12:00:00Z",
    confirmedAt: "2026-11-14T12:00:02Z",
    expiresAt: null,
    ...overrides,
  }
}

function functionClient() {
  const fetch: Fetch = (input, init) => {
    viaClientFetch.push(String(input))
    const headers = new Headers(init?.headers)
    if (!headers.has("authorization")) headers.set("authorization", `Bearer ${clientFetchToken}`)
    return globalThis.fetch(input, { ...init, headers })
  }
  return createClient({ apiUrl: origin, accessToken: token, appId, fetch })
}

function generateReport() {
  return functionClient().files.upload(new Blob([csv], { type: "text/csv" }), {
    name: "orders-2026-10.csv",
    kind: "PERMANENT",
    visibility: "APP",
    appOwned: true,
  })
}

function calls(): string[] {
  return received.map(({ method, path }) => `${method} ${path}`)
}

function apiRequests(): Received[] {
  return received.filter(({ path }) => path.startsWith(files))
}

function storageRequests(): Received[] {
  return received.filter(({ path }) => path.startsWith("/storage/"))
}

function expectFunctionCredentials(requests: Received[]): void {
  expect(requests.length).toBeGreaterThan(0)
  for (const { headers } of requests) {
    expect(headers).toMatchObject({ authorization: `Bearer ${token}`, "x-app-id": appId })
  }
}

function expectNoCredentialOnStorage(): void {
  expect(storageRequests()).toHaveLength(1)
  for (const { headers } of storageRequests()) {
    expect(headers).not.toHaveProperty("authorization")
    for (const credential of [token, clientFetchToken]) {
      expect(JSON.stringify(headers)).not.toContain(credential)
    }
  }
  expect(viaClientFetch.length).toBeGreaterThan(0)
  expect(viaClientFetch.filter((url) => !url.startsWith(`${origin}${files}`))).toEqual([])
}

beforeEach(async () => {
  routes = {}
  server = createServer((incoming, response) => {
    const chunks: Buffer[] = []
    incoming.on("data", (chunk: Buffer) => chunks.push(chunk))
    incoming.on("end", () => {
      const request = {
        method: incoming.method ?? "",
        path: incoming.url ?? "",
        headers: incoming.headers,
        body: Buffer.concat(chunks),
      }
      received.push(request)
      const route = routes[`${request.method} ${request.path.split("?")[0]}`]
      if (route) route(request, response)
      else reply(response, 404)
    })
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

afterEach(async () => {
  server.closeAllConnections()
  await new Promise<void>((resolve) => server.close(() => resolve()))
  received.length = 0
  viaClientFetch.length = 0
})

describe("files in a Server Function", () => {
  it("generates a file of the app in three steps, with the bytes on the global fetch only", async () => {
    routes = {
      [`POST ${files}`]: json(pendingUpload(), 201),
      [`PUT ${storagePath()}`]: (_request, response) => reply(response, 200),
      [`POST ${files}/${fileId}/confirm`]: json(metadata()),
    }

    await expect(generateReport()).resolves.toEqual(metadata())

    expect(calls()).toEqual([
      `POST ${files}`,
      `PUT ${signedLink().slice(origin.length)}`,
      `POST ${files}/${fileId}/confirm`,
    ])
    expectFunctionCredentials(apiRequests())
    expect(JSON.parse(apiRequests()[0]!.body.toString())).toEqual({
      name: "orders-2026-10.csv",
      contentType: "text/csv",
      sizeBytes: csv.length,
      kind: "PERMANENT",
      visibility: "APP",
      appOwned: true,
    })
    const [sent] = storageRequests()
    expect(sent?.body.toString()).toBe(csv)
    expect(sent?.headers).toMatchObject({
      "content-type": "text/csv",
      "if-none-match": "*",
      "content-length": String(csv.length),
    })
    expectNoCredentialOnStorage()
  })

  it("hands over the read link of a RESTRICTED file with the Function token, without touching storage", async () => {
    const restricted = metadata({
      visibility: "RESTRICTED",
      ownerUserId: "user-1",
      createdBy: "USER",
    })
    const link = { url: signedLink(), expiresAt: "2026-11-14T12:05:00Z" }
    routes = {
      [`GET ${files}/${fileId}`]: json(restricted),
      [`POST ${files}/${fileId}/read-url`]: json(link),
    }
    const mitra = functionClient()

    await expect(mitra.files.get(fileId)).resolves.toEqual(restricted)
    await expect(mitra.files.getUrl(fileId)).resolves.toEqual(link)

    expect(calls()).toEqual([`GET ${files}/${fileId}`, `POST ${files}/${fileId}/read-url`])
    expectFunctionCredentials(apiRequests())
    expect(storageRequests()).toEqual([])
  })

  it("downloads the content with the global fetch only", async () => {
    routes = {
      [`POST ${files}/${fileId}/read-url`]: json({
        url: signedLink(),
        expiresAt: "2026-11-14T12:05:00Z",
      }),
      [`GET ${storagePath()}`]: (_request, response) =>
        reply(response, 200, csv, { "content-type": "text/csv" }),
    }

    const content = await functionClient().files.download(fileId)

    expect(await content.text()).toBe(csv)
    expectFunctionCredentials(apiRequests())
    expectNoCredentialOnStorage()
  })

  it("fails without the signed link and deletes the pending file when storage refuses the bytes", async () => {
    routes = {
      [`POST ${files}`]: json(pendingUpload(), 201),
      [`PUT ${storagePath()}`]: (request, response) =>
        reply(response, 403, `<Error><Code>AccessDenied</Code><Url>${request.path}</Url></Error>`, {
          "content-type": "application/xml",
        }),
      [`DELETE ${files}/${fileId}`]: (_request, response) => reply(response, 204),
    }

    const error = await generateReport().catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(FileTransferError)
    expect(error).toMatchObject({ step: "send", fileId, status: 403, cleanedUp: true })
    expect(calls()).toEqual([
      `POST ${files}`,
      `PUT ${signedLink().slice(origin.length)}`,
      `DELETE ${files}/${fileId}`,
    ])
    expectFunctionCredentials(apiRequests())
    expectNoCredentialOnStorage()
    const everything = [
      String(error),
      JSON.stringify(error),
      inspect(error, { depth: null, showHidden: true }),
    ].join("\n")
    expect(everything).not.toContain(signature)
    expect(everything).not.toContain(storagePath())
  })

  it("keeps the sent file when the confirmation fails, with the API error as the cause", async () => {
    routes = {
      [`POST ${files}`]: json(pendingUpload(), 201),
      [`PUT ${storagePath()}`]: (_request, response) => reply(response, 200),
      [`POST ${files}/${fileId}/confirm`]: json(
        { code: "FILE_NOT_UPLOADED", message: "The file was not uploaded" },
        409,
      ),
    }

    const error = await generateReport().catch((reason: unknown) => reason)

    expect(error).toBeInstanceOf(FileTransferError)
    expect(error).toMatchObject({ step: "confirm", fileId, status: null, cleanedUp: false })
    expect((error as FileTransferError).cause).toBeInstanceOf(MitraApiError)
    expect((error as FileTransferError).cause).toMatchObject({
      status: 409,
      code: "FILE_NOT_UPLOADED",
    })
    expect(calls()).not.toContain(`DELETE ${files}/${fileId}`)
  })
})
