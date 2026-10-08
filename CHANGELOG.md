# Changelog

All notable changes to this project are documented in this file.

## 0.2.8

Stable release of the 0.2.8-beta.0 line, already on the `beta` tag and running in the dev Functions
template. No change on top of the beta.

- `init()` resolves without any network call instead of fetching the app info route, which is rate
  limited per IP. `await client.init()`, `dataSourceId` and `MITRA_DATA_SOURCE_ID` still work.

## 0.2.8-beta.0

- `init()` resolves without any network call. It used to fetch `GET /code-studio/api/v1/apps/<id>/info`
  only to keep a data source id that no operation reads, and that public route is rate limited per
  IP, so Functions sharing an e2b host failed at startup with 429. `await client.init()` still works,
  and `dataSourceId` and `MITRA_DATA_SOURCE_ID` are still accepted.

## 0.2.7

Stable release of the 0.2.7-beta.0 line, already on the `beta` tag. This release only moves the
Core dependency to its stable number, so no runtime behavior in this package changes.

- Depend on `@mitralab.io/sdk-core@0.2.12`, the stable release of the 0.2.12-beta.1 surface: a
  `cancel()` pressed before the agent turn starts waits for the box to admit the prompt and goes out
  right after it.
- Pin the SDK-PARITY-001 corpus to Core `0.2.12` with its digest and immutable source commit.

## 0.2.7-beta.0

- Depend on `@mitralab.io/sdk-core@0.2.12-beta.1`: a `cancel()` pressed before the agent turn starts
  waits for the box to admit the prompt and goes out right after it, instead of being dropped while
  the answer kept coming. `cancelled` is only emitted once the stop was delivered.
- Pin the SDK-PARITY-001 corpus to Core `0.2.12-beta.1` with its digest and immutable source commit.

## 0.2.6

Stable release of the 0.2.6-beta.0 line, already on the `beta` tag. This release only moves the
Core dependency to its stable number, so no runtime behavior in this package changes.

- Depend on `@mitralab.io/sdk-core@0.2.11`, the stable release of the 0.2.11-beta.0 surface: the
  agent turn usage (`AgentTurnUsage`) on `AgentMessage.usage`, on the `agent` item of
  `loadHistory` and on `turnEnd` and `sendAndWait`.
- Pin the SDK-PARITY-001 corpus to Core `0.2.11` with its digest and immutable source commit.

## 0.2.6-beta.0

- Depend on `@mitralab.io/sdk-core@0.2.11-beta.0`: the Agent message that closed a turn carries
  `usage` (`AgentTurnUsage`) from the Copilot history, `loadHistory` keeps it on that `agent` item,
  and `turnEnd` and `sendAndWait` carry the turn's `usage` from `stepFinish`.
- Export `AgentTurnUsage` and `AgentTurnUsageRequest`.
- Pin the SDK-PARITY-001 corpus to Core `0.2.11-beta.0` with its digest and immutable source commit.

## 0.2.5

Stable release of the 0.2.5-beta.0 line, already on the `beta` tag. This release only moves the
Core dependency to its stable number, so no runtime behavior in this package changes.

- Depend on `@mitralab.io/sdk-core@0.2.10`, the stable release of the 0.2.10-beta.0 surface: the
  subscription usage in `agentCredentials.usage`, `agentConnections.usage` and the `providerUsage`
  session event.
- Pin the SDK-PARITY-001 corpus to Core `0.2.10` with its digest and immutable source commit.

## 0.2.5-beta.0

- Depend on `@mitralab.io/sdk-core@0.2.10-beta.0`: `agentCredentials.usage(provider, { scope })`
  and `agentConnections.usage(id, provider)` read the last subscription reading a chat on that
  credential reported, with no chat open, as `{ harness, observedAt, status, windows }`, or `null`
  while none has; the Agent session emits the same reading as `providerUsage` during a turn on the
  box.
- Export `CredentialUsage`, `CredentialUsageWindow` and `AgentProviderUsage`.
- Pin the SDK-PARITY-001 corpus to Core `0.2.10-beta.0` with its digest and immutable source commit.

## 0.2.4

Stable release of the 0.2.4-beta.0 line, already on the `beta` tag. This release only moves the
Core dependency to its stable number, so no runtime behavior in this package changes.

- Depend on `@mitralab.io/sdk-core@0.2.9`, the stable release of the 0.2.9-beta.1 surface: the
  chat's direct channel to its box as the Agent session transport, limited to business agent chats.
- Pin the SDK-PARITY-001 corpus to Core `0.2.9` with its digest and immutable source commit.

## 0.2.4-beta.0

- Depend on `@mitralab.io/sdk-core@0.2.9-beta.1`, which takes the chat's direct channel to its box
  as the Agent session transport. Sessions ask the Copilot for the channel and send to the box:
  over its WebSocket, or over its HTTP routes (POST to send, SSE to read) on a runtime without
  one. The Copilot SSE and `POST /inputs` stay as the fallback, announced by a `channelDeclined`
  raw event. Only an agent chat, a task with an `agentId`, goes to the box, also when opened by
  `taskId`; a chat without `agentId` stays on the Copilot and never asks for the channel. New agent
  chats are created with `runtime: "T3"` unless the session names a runtime.
- Wire the channel to the client's API URL. The box routes use `globalThis.fetch`, never the
  client's `fetch`, so a custom fetch that adds `Authorization` cannot send the token to the box.
  `auto` uses the box WebSocket when the runtime has one and HTTP otherwise, which is the case of
  the Serverless Functions runtime on Node 20. No WebSocket dependency is added.
- Accept an optional `WebSocket` implementation, such as `ws`, in the client configuration.
- `transport: "websocket"` no longer rejects: it now means the box socket, and falls back to the
  Copilot SSE with `channelDeclined` when no WebSocket is available.
- The new `accepted` session event fires when the box admits the turn, so a Function can send,
  await it, and return. `sendAndWait` is unchanged.
- Pin the SDK-PARITY-001 corpus to Core `0.2.9-beta.1` with its digest and immutable source commit.

## 0.2.3

Stable release of the 0.2.2-beta.0 and 0.2.3-beta.0 line. This release only moves the Core
dependency. The module layer forwards inputs verbatim, so no runtime behavior in this package
changes.

- Depend on `@mitralab.io/sdk-core@0.2.8`, the stable release of the 0.2.8-beta.0 surface: the
  credential scope, the person's custom providers on connections and credentials, the runtime on
  task creation, and no `model` field on Agent task creation or on the message send.
- Pin the SDK-PARITY-001 corpus to Core `0.2.8` with its digest and immutable source commit.

## 0.2.3-beta.0

This release only moves the Core dependency. The module layer forwards inputs verbatim, so no
runtime behavior in this package changes.

- Depend on `@mitralab.io/sdk-core@0.2.8-beta.0`, which drops the `model` field from Agent task
  creation and from the message send: a chat is created and a message is sent with `agentType`
  and `reasoningEffort` only, and a custom provider is chosen by the `agentType` the model
  catalog returns.
- Pin the SDK-PARITY-001 corpus to Core `0.2.8-beta.0` with its digest and immutable source commit.

## 0.2.0-beta.1

This release only moves the Core dependency. The module layer forwards `integrationAdmin` inputs
verbatim, so no runtime behavior in this package changes.

- Depend on `@mitralab.io/sdk-core@0.2.0-beta.1`, whose `integrationAdmin` accepts a template
  config defined inline (`fieldsSchemaInline`, `requestConfigInline`, `loginConfigInline`) instead
  of a catalog `templateId`, and reads configs back with a nullable `templateId`.
- Re-export the new Core `IntegrationFieldSchemaInput` type so consumers can describe inline
  fields without redeclaring the shape.
- Pin the SDK-PARITY-001 corpus to Core `0.2.0-beta.1` with its digest and immutable source commit.

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
