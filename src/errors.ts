export class MitraConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MitraConfigurationError"
  }
}

export interface MitraApiErrorOptions {
  code?: string
  details?: unknown
  requestId?: string
  retryable?: boolean
}

export class MitraApiError extends Error {
  readonly status: number
  readonly code: string | undefined
  readonly details: unknown
  readonly requestId: string | undefined
  readonly retryable: boolean | undefined

  constructor(message: string, status: number, options: MitraApiErrorOptions = {}) {
    super(message)
    this.name = "MitraApiError"
    this.status = status
    this.code = options.code
    this.details = options.details
    this.requestId = options.requestId
    this.retryable = options.retryable
  }
}
