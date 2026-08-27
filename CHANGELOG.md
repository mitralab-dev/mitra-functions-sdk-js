# Changelog

All notable changes to this project are documented in this file.

## 0.2.0-beta.0

This working tree prepares the `0.2.0-beta.0` package. The immutable Core source pin
and npm lock integrity are finalized after `@mitralab.io/sdk-core@0.2.0-beta.0` is
published and before this package is released.

- Re-export exactly the runtime and type surface of `mitra-sdk@1.0.63-beta.39`,
  marked `@deprecated`, without adding browser-only interactions exports.
- Configure the legacy SDK from the same environment `createClient` resolves.
- Expose the complete native `sdk-core` module surface through direct service transports.
- Add authenticated Code Studio, Copilot, and Messenger transports.
- Add native live Agent sessions over authenticated HTTP input and SSE output channels.
- Forward Core Agent session transport preferences to the runtime SSE adapter.
- Add an anonymous Public Functions transport that omits authorization and app headers.
- Add anonymous polling for executions created by the public async Function route.
- Align the deprecated bridge with the `mitra-sdk` beta.39 version baked into the E2B runtime.
- Restrict Code Studio operations to the configured runtime app and add a `currentApp` facade.
- Align stable page and record envelopes with Core 0.2, bind app context to the configured app,
  and execute Custom Queries without a caller-selected Data Source.
- Leave request deadlines to the Server Function runtime by default while preserving opt-in
  `timeoutMs` deadlines.
- Document runtime authorization gaps and the pending Core 0.2.0-beta.0 release gate.

## 0.1.0

- Add environment-based Server Function client configuration.
- Add current user, entity, custom query, Server Function, and integration APIs.
- Add typed errors, request timeout, credential redaction, and package release automation.
- Compose shared API contracts and modules from `@mitralab.io/sdk-core`.
- Add commit- and digest-pinned SDK parity gates backed by the installed Core corpus.
