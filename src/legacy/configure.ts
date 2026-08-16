import { configureSdkMitra } from "mitra-sdk"
import type { ResolvedMitraClientConfig } from "../config"

/**
 * Points the legacy `mitra-sdk` at the same runtime configuration this client resolved,
 * so legacy Server Function code keeps working without reading the environment itself.
 *
 * The value of `apiUrl` is forwarded unchanged. The legacy SDK reaches the platform
 * through the BFF gateway routes and this package derives its own service prefixes from
 * the same base URL, so no URL transformation is applied or implied here.
 *
 * The access token is forwarded as resolved. The legacy SDK stores it without the
 * `Bearer` prefix and adds the prefix per request, accepting either form.
 */
export function configureLegacySdk(config: ResolvedMitraClientConfig): void {
  configureSdkMitra({
    baseURL: config.apiUrl,
    token: config.accessToken,
    projectId: config.appId,
  })
}
