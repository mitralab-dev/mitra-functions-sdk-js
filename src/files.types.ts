export interface FileChecksum {
  algorithm: "SHA256"
  type: "COMPOSITE"
  value: string
  partSize: number
  partCount: number
}

export interface FileMetadata {
  fileId: string
  state: "UPLOADING" | "STAGED" | "READY" | "DELETING" | "DELETED"
  name: string
  contentType: string
  size: number
  checksum: FileChecksum | null
  pendingExpiresAt: string | null
}

export interface FileGrant {
  grantId: string
  fileId: string
  operation: "UPLOAD" | "READ"
  expiresAt: string
}

export interface FileUploadInput {
  name: string
  contentType: string
  size: number
  partChecksums: string[]
  resourceRef?: string
}

export interface FileUpload {
  file: FileMetadata
  uploadId: string
  grant: FileGrant
}

export interface FileIdempotencyOptions {
  idempotencyKey: string
}

export interface FilesModule {
  createUpload(input: FileUploadInput, options: FileIdempotencyOptions): Promise<FileUpload>
  commit(fileId: string): Promise<FileMetadata>
  get(fileId: string): Promise<FileMetadata>
  createReadGrant(fileId: string, options: FileIdempotencyOptions): Promise<FileGrant>
  createReadGrants(fileIds: string[], options: FileIdempotencyOptions): Promise<FileGrant[]>
  delete(fileId: string): Promise<void>
}
