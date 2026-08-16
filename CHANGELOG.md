# Changelog

All notable changes to this project are documented in this file.

## Unreleased

- Re-export the public surface of the legacy `mitra-sdk` package, marked `@deprecated`.
- Configure the legacy SDK from the same environment `createClient` resolves.

## 0.1.0

- Add environment-based Server Function client configuration.
- Add current user, entity, custom query, Server Function, and integration APIs.
- Add typed errors, request timeout, credential redaction, and package release automation.
- Compose shared API contracts and modules from `@mitralab.io/sdk-core`.
- Add commit- and digest-pinned SDK parity gates backed by the installed Core corpus.
