import type { ResolvedMitraClientConfig } from "./config"
import { MitraApiError, MitraConfigurationError } from "./errors"
import { HttpClient } from "./http-client"
import type { FileGrant, FileMetadata, FilesModule, FileUpload } from "./files.types"

const PART_SIZE = 5 * 1024 * 1024
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SHA256 = /^[A-Za-z0-9+/]{43}=$/

function id(value: string): string {
  if (typeof value !== "string" || !UUID.test(value)) {
    throw new MitraConfigurationError("File IDs and idempotency keys must be UUIDs")
  }
  return value
}

function invalidResponse(): never {
  throw new MitraApiError("Invalid files response", 0, { code: "INVALID_RESPONSE" })
}

function date(value: unknown): value is string {
  return typeof value === "string" && value.endsWith("Z") && Number.isFinite(Date.parse(value))
}

function metadata(value: FileMetadata): FileMetadata {
  if (
    !value ||
    !UUID.test(value.fileId) ||
    !["UPLOADING", "STAGED", "READY", "DELETING", "DELETED"].includes(value.state) ||
    typeof value.name !== "string" ||
    typeof value.contentType !== "string" ||
    !Number.isSafeInteger(value.size) ||
    value.size < 1 ||
    value.size > 5 * PART_SIZE ||
    (value.pendingExpiresAt !== null && !date(value.pendingExpiresAt))
  )
    invalidResponse()
  const checksum = value.checksum
  if (["STAGED", "READY"].includes(value.state) && checksum === null) invalidResponse()
  if (
    checksum !== null &&
    (!checksum ||
      checksum.algorithm !== "SHA256" ||
      checksum.type !== "COMPOSITE" ||
      checksum.partSize !== PART_SIZE ||
      checksum.partCount !== Math.ceil(value.size / PART_SIZE) ||
      !new RegExp(`^[A-Za-z0-9+/]{43}=-${checksum.partCount}$`).test(checksum.value))
  )
    invalidResponse()
  // Select the public fields so internal storage locations or credentials never escape.
  return {
    fileId: value.fileId,
    state: value.state,
    name: value.name,
    contentType: value.contentType,
    size: value.size,
    pendingExpiresAt: value.pendingExpiresAt,
    checksum:
      checksum === null
        ? null
        : {
            algorithm: checksum.algorithm,
            type: checksum.type,
            value: checksum.value,
            partSize: checksum.partSize,
            partCount: checksum.partCount,
          },
  }
}

function grant(value: FileGrant, fileId: string, operation: FileGrant["operation"]): FileGrant {
  if (
    !value ||
    !UUID.test(value.grantId) ||
    value.fileId !== fileId ||
    value.operation !== operation ||
    !date(value.expiresAt)
  )
    invalidResponse()
  return { grantId: value.grantId, fileId, operation, expiresAt: value.expiresAt }
}

export function createFilesModule(config: ResolvedMitraClientConfig): FilesModule {
  const transport = () => {
    // API key exchange cannot renew the execution's file authorization.
    return new HttpClient({
      baseUrl: `${config.apiUrl}/data-manager`,
      authentication: "bearer",
      accessToken: config.accessToken,
      appId: config.appId,
      fetch: config.fetch,
      redactErrors: true,
      ...(config.timeoutMs === undefined ? {} : { timeoutMs: config.timeoutMs }),
    })
  }
  const module: FilesModule = {
    async createUpload(input, options) {
      const headers = { "Idempotency-Key": id(options.idempotencyKey) }
      if (
        !input ||
        typeof input.name !== "string" ||
        !input.name.trim() ||
        typeof input.contentType !== "string" ||
        !input.contentType.trim() ||
        !Number.isSafeInteger(input.size) ||
        input.size < 1 ||
        input.size > 5 * PART_SIZE ||
        !Array.isArray(input.partChecksums) ||
        input.partChecksums.length !== Math.ceil(input.size / PART_SIZE) ||
        input.partChecksums.some((part) => typeof part !== "string" || !SHA256.test(part)) ||
        (input.resourceRef !== undefined && typeof input.resourceRef !== "string")
      ) {
        throw new MitraConfigurationError("Invalid file upload metadata or checksum manifest")
      }
      const response = await transport().post<FileUpload>(
        "/api/v1/files/uploads",
        {
          name: input.name,
          contentType: input.contentType,
          size: input.size,
          partChecksums: [...input.partChecksums],
          ...(input.resourceRef === undefined ? {} : { resourceRef: input.resourceRef }),
        },
        headers,
      )
      if (!response || typeof response.uploadId !== "string" || !response.uploadId.trim()) {
        invalidResponse()
      }
      const file = metadata(response.file)
      if (file.size !== input.size) invalidResponse()
      return {
        file,
        uploadId: response.uploadId,
        grant: grant(response.grant, file.fileId, "UPLOAD"),
      }
    },
    async commit(fileId) {
      const file = metadata(
        await transport().post<FileMetadata>(`/api/v1/files/${id(fileId)}/commit`),
      )
      if (file.fileId !== fileId || file.state !== "READY") invalidResponse()
      return file
    },
    async get(fileId) {
      const file = metadata(await transport().get<FileMetadata>(`/api/v1/files/${id(fileId)}`))
      if (file.fileId !== fileId) invalidResponse()
      return file
    },
    async createReadGrant(fileId, options) {
      return (await module.createReadGrants([fileId], options))[0]!
    },
    async createReadGrants(fileIds, options) {
      if (
        !Array.isArray(fileIds) ||
        fileIds.length < 1 ||
        fileIds.length > 10 ||
        new Set(fileIds).size !== fileIds.length
      ) {
        throw new MitraConfigurationError("Read grants require 1 to 10 distinct file IDs")
      }
      const ids = fileIds.map(id)
      const values = await transport().post<FileGrant[]>(
        "/api/v1/files/read-grants",
        { fileIds: ids },
        {
          "Idempotency-Key": id(options.idempotencyKey),
        },
      )
      if (
        !Array.isArray(values) ||
        values.length !== ids.length ||
        new Set(values.map((value) => value?.fileId)).size !== ids.length
      )
        invalidResponse()
      return ids.map((fileId) =>
        grant(
          values.find((value) => value?.fileId === fileId)!,
          fileId,
          "READ",
        ),
      )
    },
    async delete(fileId) {
      await transport().delete(`/api/v1/files/${id(fileId)}`)
    },
  }
  return module
}
