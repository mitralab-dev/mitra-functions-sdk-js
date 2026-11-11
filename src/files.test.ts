import { inspect } from "node:util"
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest"
import {
  createClient,
  createClientFromApiKey,
  createClientFromEnvironment,
  MitraConfigurationError,
} from "./index"
import type {
  Fetch,
  FileGrant,
  FileMetadata,
  FileUpload,
  FileUploadInput,
  FilesModule,
} from "./index"

const fileId = "00000000-0000-4000-8000-000000000001"
const grantId = "00000000-0000-4000-8000-000000000002"
const key = "00000000-0000-4000-8000-000000000003"
const digest = "a".repeat(43) + "="
const input: FileUploadInput = {
  name: "report.txt",
  contentType: "text/plain",
  size: 3,
  partChecksums: [digest],
}
const file: FileMetadata = {
  fileId,
  state: "UPLOADING",
  name: input.name,
  contentType: input.contentType,
  size: 3,
  checksum: null,
  pendingExpiresAt: "2030-01-01T00:00:00Z",
}
const grant: FileGrant = { fileId, grantId, operation: "UPLOAD", expiresAt: "2030-01-01T00:00:00Z" }
const upload: FileUpload = { file, uploadId: key, grant }
const config = {
  apiUrl: "https://api.example.com",
  appId: "app",
  accessToken: "execution-token",
}
const ready: FileMetadata = {
  ...file,
  state: "READY",
  checksum: {
    algorithm: "SHA256",
    type: "COMPOSITE",
    value: `${digest}-1`,
    partSize: 5 * 1024 * 1024,
    partCount: 1,
  },
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("files credentials", () => {
  it.each(["config", "environment"])("uses the execution %s credential", async (source) => {
    const fetch = vi.fn<Fetch>().mockResolvedValue(Response.json(upload))
    vi.stubGlobal("fetch", fetch)
    const client =
      source === "config"
        ? createClient({ ...config, fetch })
        : createClientFromEnvironment({
            MITRA_API_URL: config.apiUrl,
            MITRA_APP_ID: config.appId,
            MITRA_TOKEN: config.accessToken,
            MITRA_FILES_TOKEN: "retired-token",
          })
    expect(JSON.stringify(client)).not.toContain(config.accessToken)
    expect(inspect(client, { showHidden: true, depth: null })).not.toContain(config.accessToken)
    const result = await client.files.createUpload(
      { ...input, resourceRef: "message-1" },
      { idempotencyKey: key },
    )
    expect(result).toEqual(upload)
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "X-App-Id": "app",
        "Idempotency-Key": key,
      },
    })
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toEqual({
      ...input,
      resourceRef: "message-1",
    })
    expectTypeOf(client.files).toEqualTypeOf<FilesModule>()
    expectTypeOf(result).toEqualTypeOf<FileUpload>()
  })

  it("does not renew files authority through an API key provider on 401", async () => {
    const token = `${Buffer.from(JSON.stringify({ alg: "HS512" })).toString("base64url")}.${Buffer.from(
      JSON.stringify({ token_use: "app", app_id: config.appId, exp: 4102444800 }),
    ).toString("base64url")}.signature`
    const fetch = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(Response.json({ accessToken: token }))
      .mockResolvedValue(Response.json({ code: "INVALID_FILES_TOKEN" }, { status: 401 }))
    const client = await createClientFromApiKey({ ...config, apiKey: "api-key", fetch })
    await expect(client.files.get(fileId)).rejects.toMatchObject({ status: 401 })
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([
      `${config.apiUrl}/iam/api/v1/auth/exchange`,
      `${config.apiUrl}/data-manager/api/v1/files/${fileId}`,
    ])
    expect(fetch.mock.calls[1]?.[1]?.headers).toMatchObject({ Authorization: `Bearer ${token}` })
  })

  it("preserves a backend refusal without renewal, fallback or sensitive error output", async () => {
    const fetch = vi.fn<Fetch>().mockResolvedValue(
      Response.json(
        {
          error_code: "INVALID_FILES_TOKEN",
          message: "files-secret https://storage.example/?signature=secret",
          details: { url: "https://storage.example/?signature=secret", token: "files-secret" },
        },
        { status: 403 },
      ),
    )
    const client = createClient({ ...config, accessToken: "wrong-token", fetch })
    const error = await client.files.get(fileId).catch((value: unknown) => value)
    expect(error).toMatchObject({
      status: 403,
      code: "INVALID_FILES_TOKEN",
      message: "File API request failed",
    })
    expect(inspect(error)).not.toMatch(/files-secret|storage.example|signature=|wrong-token/)
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch.mock.calls[0]?.[1]?.headers).toMatchObject({ Authorization: "Bearer wrong-token" })
  })
})

describe("files contracts", () => {
  it("keeps URLs and tokens out of returned metadata and grants", async () => {
    const fetch = vi.fn<Fetch>().mockResolvedValue(
      Response.json({
        ...upload,
        file: { ...file, url: "secret-url" },
        grant: { ...grant, token: "secret-token" },
        token: "secret-token",
      }),
    )
    expect(
      await createClient({ ...config, fetch }).files.createUpload(input, { idempotencyKey: key }),
    ).toEqual(upload)
  })

  it("treats the upload ID as an opaque server reference", async () => {
    const response = { ...upload, uploadId: "opaque-upload-session" }
    const fetch = vi.fn<Fetch>().mockResolvedValue(Response.json(response))
    await expect(
      createClient({ ...config, fetch }).files.createUpload(input, { idempotencyKey: key }),
    ).resolves.toEqual(response)
  })

  it("preserves the current metadata state on an idempotent create replay", async () => {
    const response = { ...upload, file: ready }
    const fetch = vi.fn<Fetch>().mockResolvedValue(Response.json(response))
    await expect(
      createClient({ ...config, fetch }).files.createUpload(input, { idempotencyKey: key }),
    ).resolves.toEqual(response)
  })

  it("routes lifecycle calls and maps a reordered batch back to the requested files", async () => {
    const read = { ...grant, operation: "READ" }
    const fetch = vi
      .fn<Fetch>()
      .mockResolvedValueOnce(Response.json(ready))
      .mockResolvedValueOnce(Response.json(ready))
      .mockResolvedValueOnce(Response.json([read]))
      .mockResolvedValueOnce(Response.json([{ ...read, fileId: key }, read]))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
    const files = createClient({ ...config, fetch }).files
    await expect(files.commit(fileId)).resolves.toEqual(ready)
    await expect(files.get(fileId)).resolves.toEqual(ready)
    await expect(files.createReadGrant(fileId, { idempotencyKey: key })).resolves.toEqual(read)
    await expect(files.createReadGrants([fileId, key], { idempotencyKey: key })).resolves.toEqual([
      read,
      { ...read, fileId: key },
    ])
    await expect(files.delete(fileId)).resolves.toBeUndefined()
    expect(fetch.mock.calls.map(([url, options]) => [String(url), options?.method])).toEqual([
      [`${config.apiUrl}/data-manager/api/v1/files/${fileId}/commit`, "POST"],
      [`${config.apiUrl}/data-manager/api/v1/files/${fileId}`, "GET"],
      [`${config.apiUrl}/data-manager/api/v1/files/read-grants`, "POST"],
      [`${config.apiUrl}/data-manager/api/v1/files/read-grants`, "POST"],
      [`${config.apiUrl}/data-manager/api/v1/files/${fileId}`, "DELETE"],
    ])
    expect(fetch.mock.calls[0]?.[1]?.body).toBeUndefined()
  })

  it.each([
    { size: 0 },
    { size: 25 * 1024 * 1024 + 1, partChecksums: Array(6).fill(digest) },
    { size: 1.5 },
    { name: "" },
    { contentType: "" },
    { partChecksums: [] },
    { partChecksums: ["bad"] },
    { partChecksums: [digest, digest] },
    { resourceRef: 12 },
  ])("rejects invalid upload input %j before networking", async (invalid) => {
    const fetch = vi.fn<Fetch>()
    await expect(
      createClient({ ...config, fetch }).files.createUpload(
        { ...input, ...invalid } as FileUploadInput,
        { idempotencyKey: key },
      ),
    ).rejects.toBeInstanceOf(MitraConfigurationError)
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each(
    [
      [],
      [fileId, fileId],
      Array.from(
        { length: 11 },
        (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      ),
      ["../escape"],
    ].map((ids) => ({ ids })),
  )("rejects invalid read batch $ids", async ({ ids }) => {
    const fetch = vi.fn<Fetch>()
    await expect(
      createClient({ ...config, fetch }).files.createReadGrants(ids, { idempotencyKey: key }),
    ).rejects.toBeInstanceOf(MitraConfigurationError)
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    null,
    { ...upload, uploadId: "" },
    { ...upload, file: { ...file, size: 4 } },
    { ...upload, file: { ...file, state: "READY" } },
    { ...upload, grant: { ...grant, fileId: key } },
    { ...upload, grant: { ...grant, operation: "READ" } },
    { ...upload, grant: { ...grant, expiresAt: "yesterday" } },
  ])("rejects mismatched upload response %j", async (response) => {
    const fetch = vi.fn<Fetch>().mockResolvedValue(Response.json(response))
    await expect(
      createClient({ ...config, fetch }).files.createUpload(input, { idempotencyKey: key }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" })
  })

  it.each([
    { fileId: key },
    { checksum: { ...ready.checksum, type: "FULL_OBJECT" } },
    { checksum: { ...ready.checksum, partCount: 2 } },
    { pendingExpiresAt: "bad" },
  ])("rejects invalid metadata %j", async (change) => {
    const fetch = vi.fn<Fetch>().mockResolvedValue(Response.json({ ...ready, ...change }))
    await expect(createClient({ ...config, fetch }).files.get(fileId)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    })
  })

  it.each(
    [[], [grant], [{ ...grant, operation: "READ", fileId: key }]].map((response) => ({ response })),
  )("rejects invalid grants $response", async ({ response }) => {
    const fetch = vi.fn<Fetch>().mockResolvedValue(Response.json(response))
    await expect(
      createClient({ ...config, fetch }).files.createReadGrant(fileId, { idempotencyKey: key }),
    ).rejects.toMatchObject({ code: "INVALID_RESPONSE" })
  })
})
