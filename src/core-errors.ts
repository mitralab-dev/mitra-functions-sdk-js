import type { SdkCoreErrorFactory } from "@mitralab.io/sdk-core"

import { MitraApiError, MitraConfigurationError } from "./errors"

/** Lets shared core modules raise this SDK's own error types. */
export const coreErrors: SdkCoreErrorFactory = {
  configuration: (message) => new MitraConfigurationError(message),
  invalidResponse: (message) =>
    new MitraApiError(message, 200, { code: "INVALID_RESPONSE", retryable: false }),
}
