# Mitra Functions SDK for JavaScript

JavaScript and TypeScript SDK for code running inside Mitra Server Functions. Its native surface exposes the application-scoped Platform APIs that a function commonly needs without requiring browser authentication in the runtime.

The SDK uses the short-lived platform access token injected into the function runtime. It does not log in users, persist credentials, refresh tokens, use API keys, or retry requests automatically.

Shared API contracts and modules come from `@mitralab.io/sdk-core`. This package owns only the Server Function runtime adapter: environment configuration, token headers, optional request deadlines, credential redaction, redirect refusal, and one-attempt request policy. The core never receives or stores the token.

## Installation

```bash
npm install @mitralab.io/functions-sdk
```

Node.js 18 or newer is required.

## Runtime integration

The SDK reads the canonical runtime variables:

- `MITRA_API_URL`
- `MITRA_PLATFORM_ACCESS_TOKEN`
- `MITRA_APP_ID`
- `MITRA_DATA_SOURCE_ID`, retained for runtime compatibility when already resolved

The runtime also injects these names for the deprecated reexports:

- `MITRA_BASE_URL`
- `MITRA_TOKEN`
- `MITRA_PROJECT_ID`

Native calls require the canonical names and never fall back to the deprecated BFF URL.
`MITRA_TOKEN` and `MITRA_PLATFORM_ACCESS_TOKEN` contain the same short-lived, app-scoped execution
token minted by the platform. Neither is a user-defined Function secret.

## Quick start

```typescript
import { createClient } from "@mitralab.io/functions-sdk"

const mitra = createClient()

export async function handler(input: { orderId: string }) {
  const order = await mitra.entities.Order.get(input.orderId)
  return { order }
}
```

Once the runtime integration is available, `createClient()` reads the process environment by default. For local development or explicit dependency injection, pass configuration directly:

```typescript
const mitra = createClient({
  apiUrl: "https://api.example.com",
  accessToken: process.env.MITRA_PLATFORM_ACCESS_TOKEN,
  appId: "app-id",
  dataSourceId: "data-source-id",
})
```

`createClientFromEnvironment(env)` is available when a function needs to supply a specific environment object, such as in tests.

## Initialization

Entity and Custom Query operations use the app identity from the token and `X-App-Id`, so they are
available immediately. Custom Query execution sends only `parameters`; Data Manager resolves its
Data Source from the authenticated app.

`init()` and the optional `dataSourceId` configuration remain available for source compatibility.
When no Data Source is configured, `init()` resolves the nullable value from Code Studio and is
safe to call concurrently, but native Queries and Entities do not depend on it.

```typescript
const mitra = createClient()
await mitra.init()

const result = await mitra.queries.execute("5df41c69-2a74-4db6-9cca-4af2b473941f", {
  status: "active",
})
```

## API

### Current user

```typescript
const user = await mitra.auth.me()
```

The SDK only reads the current authenticated user. Login, logout, browser storage, and token refresh belong to the Platform SDK used by frontend applications.

### Entities

```typescript
type Task = {
  id: string
  title: string
  status: "pending" | "done"
}

const tasks = mitra.entities.getTable<Task>("Task")
const { data: recent } = await tasks.list({ sort: "-created_at", limit: 20 })
const { data: pending } = await tasks.filter({ status: "pending" })
const created = await tasks.create({ title: "Review order" })
await tasks.update(created.id, { status: "done" })
await tasks.delete(created.id)

const dynamic = await mitra.entities.Task.list()
```

Available methods are `list`, `filter`, `get`, `create`, `bulkCreate`, `update`, `delete`, and `deleteMany`.

### Custom queries

```typescript
const result = await mitra.queries.execute("5df41c69-2a74-4db6-9cca-4af2b473941f", {
  customerId: "customer-id",
})
```

### Server Functions

`execute` waits for a terminal execution response. `executeAsync` requests asynchronous execution and returns the pending execution record.

```typescript
const completed = await mitra.functions.execute("function-id", { orderId: "order-id" })
const pending = await mitra.functions.executeAsync("function-id", { orderId: "order-id" })
const current = await mitra.functions.getExecution(pending.id)
await mitra.functions.cancelExecution(pending.id)
```

### Integrations

```typescript
const resource = await mitra.integration.executeResource("resource-id", {
  description: "Notebook",
})

const proxy = await mitra.integration.execute("config-id", {
  method: "GET",
  endpoint: "/users",
  queryParams: { limit: "10" },
})
```

Credentials configured for an integration are injected by the Integration service. Do not pass provider credentials through function input.

Use `integrationAdmin.list()` as the native equivalent of `listIntegrationsMitra`. It calls
`GET /integration/api/v1/template-configs`; the service filters app-scoped runtime tokens to the
current app and returns its real paginated `TemplateConfigSummary` values.

Native entity methods target the public Data Manager records API, which resolves the app Data
Source from the runtime token. That API does not accept the legacy `jdbcConnectionConfigId`
selector, so records that depend on it remain available only through the deprecated bridge. The
SDK does not emulate that selection with raw SQL.

### Native modules

The native client exposes all 24 application runtime and authoring modules from
`@mitralab.io/sdk-core` directly against the owning services. `currentApp` is an additional
Functions-specific convenience facade over the Core `apps` module:

| Area                     | Modules                                                                           | Service                                 |
| ------------------------ | --------------------------------------------------------------------------------- | --------------------------------------- |
| Identity and members     | `auth`, `members`                                                                 | IAM                                     |
| Data                     | `dataSources`, `schema`, `entities`, `customQueries`, `queries`, `sql`, `imports` | Data Manager                            |
| Functions and automation | `functions`, `functionsAdmin`, `agents`, `workflows`                              | Functions                               |
| Apps                     | `apps`, `currentApp`, `context`                                                   | Code Studio and composed native modules |
| Agent runtime            | `agentTasks`, `agentCredentials`, `agentConnections`                              | Copilot                                 |
| Integrations             | `integration`, `integrationAdmin`, `integrationTemplates`, `integrationResources` | Integration                             |
| Notifications            | `messenger`                                                                       | Messenger                               |
| Anonymous execution      | `publicFunctions`                                                                 | Functions public API                    |

These modules do not use the BFF gateway. The BFF remains only behind the deprecated
`mitra-sdk` compatibility exports described below.

Single-Function `functionsAdmin.create()` and `functionsAdmin.patch()` expose
`cronExpression`, `cronInputJson`, and `cronEnabled` as one composed scheduling unit. On create,
omit all three for no schedule; supplying any one requires a non-blank expression. The new schedule
uses `UTC` and starts `ACTIVE` unless `cronEnabled` is `false`. On patch, null or omitted schedule
fields preserve their stored values, an empty input object clears the scheduled input, and a blank
expression removes the schedule. A non-blank expression can create a missing schedule in `UTC`,
while `cronEnabled` explicitly pauses or resumes it. Schedule composition requires
`SCHEDULE_WRITE` and `FUNCTION_EXECUTE` in addition to the Function write permission.

Function `get()` and `list()` include all three cron fields when the caller has `SCHEDULE_READ`.
Without it, the fields are all null without consulting Scheduler. A Function with no schedule has
the same all-null shape, so those responses alone cannot distinguish absence from missing read
permission. Function bulk create, update, and patch prohibit all three cron fields; use the
single-Function methods for composed scheduling.

The native SDK deliberately has no separate schedule lifecycle methods. Create, patch, get, and
list keep Function state and its composed cron fields in one contract.

### Live Agent sessions over HTTP

`agentTasks.session()` adds the Core session state machine to the native Copilot task module. The
Functions adapter uses the direct HTTP channel because Server Functions do not provide a browser
WebSocket runtime:

```typescript
const session = mitra.agentTasks.session({
  create: true,
  agentType: "CODEX",
  transport: "http",
})

session.on("delta", ({ delta, kind }) => {
  console.log(kind, delta)
})

const result = await session.sendAndWait("Summarize today's orders")
console.log(result.content)
session.close()
```

Existing tasks use `mitra.agentTasks.session({ taskId })`. The adapter opens
`GET /copilot/api/v1/tasks/{taskId}/events` as a Server-Sent Events (SSE) stream before it sends
input to `POST /inputs`. Both calls use the fixed runtime token in `Authorization` plus
`X-App-Id`; credentials are never placed in the URL. `transport: "auto"` and `"http"` use this
channel, while `"websocket"` rejects locally.

When `timeoutMs` is configured, it applies only while waiting for the SSE response headers. Once
the handshake succeeds, the body remains open until the session closes, its abort signal fires, or
the server disconnects. The parser ignores `hello` and `ping` keepalives and forwards `message`
events to the Core session manager. Core performs one reconnect and reconciles persisted messages
after an unexpected disconnect.

### App-scoped Code Studio access

The Functions runtime is fixed to the configured `appId`. `apps.list()` and `apps.create()`
reject locally because they are tenant-level operations. Every other `apps` method rejects
an app ID different from the configured runtime app before making a request.

Use `currentApp` when possible. It exposes the same current-app lifecycle without repeating
the app ID:

```typescript
const app = await mitra.currentApp.get()
const published = await mitra.currentApp.get({ version: "PUBLISHED" })
await mitra.currentApp.update({ name: "Orders" })
await mitra.currentApp.mergeFiles({ "src/generated.ts": "export const ready = true" })
const previewDeploy = await mitra.currentApp.build()
await mitra.currentApp.publish({ externalAccess: true })
```

`build()` returns the `AppDeploy` created for preview polling. `get()` preserves the Core
`AppGetOptions`, and `publish()` preserves `AppPublishOptions`.

The client-side check prevents accidental cross-app calls, but it is not a security boundary.
Code Studio must also enforce the JWT `app_id` claim in the backend. Until that enforcement is
deployed, the access token must be treated as sensitive even though this SDK fixes the app ID.

### Public Functions

`publicFunctions` calls `/functions/public/v1` with a dedicated anonymous transport. It never
sends `Authorization` or `X-App-Id`.

```typescript
const result = await mitra.publicFunctions.execute("public-function-id", { value: 1 })
const queued = await mitra.publicFunctions.executeAsync("public-function-id", { value: 1 })
```

An asynchronous public execution returns its ID and initial status as fire-and-forget. The public
API does not expose anonymous polling or cancellation. Use synchronous `execute` when the caller
needs the result, or authenticated `functions.executeAsync` plus `functions.getExecution` when the
caller has an app-scoped token.

## Runtime authorization

The JWT `app_id` claim is the authority for application scope. `X-App-Id` carries runtime
context for protected service requests and must not be used by a backend as the authorization
boundary.

Against the current `origin/alpha` service and IAM policies, 109 of the 120 MCP capabilities
are usable or authorizable from an app-scoped Server Function. The `dataSources.bulk*` methods
compose the existing singular Data Manager endpoints, so they do not require a coordinated
service rollout. The remaining capabilities have these known constraints:

| Capability                            | Runtime behavior                                            | Reason                                                                                                             |
| ------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Member reads through `members.list()` | `403 INSUFFICIENT_PERMISSIONS`                              | `MEMBER_READ` is deliberately absent from the SF token policy. App context excludes members.                       |
| Function secret list/create/delete    | `403 INSUFFICIENT_PERMISSIONS`                              | `FUNCTION_SECRET_READ`, `FUNCTION_SECRET_WRITE`, and `FUNCTION_SECRET_DELETE` are absent from the SF token policy. |
| Agent runtime operations              | Configuration or service rejection without an agent context | The runtime must inject or otherwise provide the applicable `agent_id`.                                            |
| `apps.list()` and `apps.create()`     | Local `MitraConfigurationError`                             | Tenant-level app collection operations are not applicable to an app-scoped runtime.                                |
| `messenger.notify()`                  | Depends on the authenticated user's channel                 | The call is authorized, but delivery requires a configured notification channel.                                   |

The methods remain part of the typed API so clients with a different authorized token can use
the shared contract. This SDK does not broaden IAM permissions or retry a rejected operation.

### Core and legacy type names

The deprecated `AgentConnection`, `AgentMessage`, `AgentModel`, and `ListTablesOptions` names keep
their original `mitra-sdk` meanings for source compatibility. Import the native Core contracts as
`CoreAgentConnection`, `CoreAgentMessage`, `CoreAgentModel`, and `CoreListTablesOptions`.

The deprecated package also owns `AgentTaskSession`, `AgentTimelineItem`, and `AgentToolEvent`.
Their native equivalents are exported as `CoreAgentTaskSession`, `CoreAgentTimelineItem`, and
`CoreAgentToolEvent`. New session options and results are available as
`CoreAgentTaskSessionOptions`, `AgentSendOptions`, `AgentSendAndWaitOptions`, and `AgentTurnResult`.
`sendAndWait()` rejects Agent turn failures with `AgentTaskTurnError`, preserving the service error
code when one is present.

## Errors and request behavior

API, timeout, invalid response, and network failures throw `MitraApiError`. The error exposes `status`, `code`, `details`, `requestId`, and `retryable`, preserving API metadata when it is provided. Configuration failures throw `MitraConfigurationError`.

When an API error omits `retryable`, the HTTP adapter classifies 4xx responses
as `false` and 5xx responses as `true`. This field is diagnostic classification
only. The SDK still makes one attempt and never retries a request automatically.

The Python package uses idiomatic specialized names for local failures. JavaScript `REQUEST_TIMEOUT` and `NETWORK_ERROR` map to Python `MitraNetworkError`, while JavaScript `INVALID_RESPONSE` maps to Python `MitraResponseError`. API responses use `MitraApiError` in both packages.

Every protected request sends `Authorization: Bearer <token>` and `X-App-Id`. Public Function
requests send neither header. Requests have no adapter-level deadline by default, so normal
long-running platform operations remain governed by the Server Function runtime. Set `timeoutMs`
to opt into a per-request deadline. Requests are never retried automatically, which avoids
replaying writes with unknown idempotency.

The access token is redacted from API error messages and error details.

## Contract parity

The test suite reads SDK-PARITY-001 version 0.2.0-beta.0 directly from the installed
`@mitralab.io/sdk-core` package. The `sdk-core-v0.2.0-beta.0` manifest pins the expected package
version, contract path, SHA-256 digest, and immutable source commit. The release gate rejects
publication unless the installed corpus matches its raw GitHub source byte for byte.

The JavaScript consumer requirement is exactly `httpAdapterCases: all`. Tests
execute all recorded 404, 503, and timeout cases through the public client and
the real `HttpClient`, using a mock fetch only at the network boundary. They
verify the request and the complete error semantics. Continuous integration and
release gates also download the canonical file from the public Core repository
at the pinned commit and compare it byte for byte with the installed package.

## Scope

The current draft expands the native client from the initial runtime operations to the complete
Core 0.2.0-beta.0 module surface listed above. Availability still depends on the runtime token resources
and the service constraints in the authorization matrix.

## Legacy compatibility

The runtime and type surface of `mitra-sdk@1.0.63-beta.39` is re-exported so existing Server
Function code can adopt `@mitralab.io/functions-sdk` without an import rewrite. Browser-only
bindings that exist only in `mitra-interactions-sdk`, including login and token refresh, are not
part of this package. Every re-export is the legacy binding itself, unchanged, and is marked
`@deprecated` with the new equivalent when one exists. Native raw SQL is available through `sql`;
app authoring and Agent runtime modules cover most builder and Agent SDK operations. Builder-specific
Git and direct-S3 flows have no one-to-one replacement and remain supported through the legacy
exports. Live Agent sessions have a native HTTP and SSE replacement through
`agentTasks.session()`.

`getGitConfigMitra` remains legacy-only because credential minting is an internal Sandbox POST
authenticated between services and is not published for app tokens. The Sandbox already owns Git
setup and token renewal for Agent workspaces; the native Functions client does not expose that
secret-producing endpoint.

```typescript
import { createClient, listProjectsMitra } from "@mitralab.io/functions-sdk"

createClient()
const projects = await listProjectsMitra()
```

`createClient()` and `createClientFromEnvironment()` configure the deprecated SDK with
`MITRA_BASE_URL`, the canonical access token, and the app ID, so legacy code does not read the
environment itself. Native modules use `MITRA_API_URL` directly and never route through the BFF.
For explicit local configuration, `legacyBaseUrl` selects the deprecated BFF base; it falls back to
`apiUrl` only when omitted. The deprecated SDK receives `appId` as its `projectId` and accepts the
access token with or without a `Bearer` prefix.

The direct legacy dependency is pinned to the exact `mitra-sdk` version. Nothing in it is modified
or published by this package.

## Development

```bash
npm install
npm run check
```

The adapter pins `@mitralab.io/sdk-core@0.2.0-beta.0` exactly. Until that version is published,
validate
against a supplied tarball without changing dependency metadata or the final lockfile:

```bash
npm install --no-save --package-lock=false /path/to/mitralab.io-sdk-core-0.2.0-beta.0.tgz
npm run lint && npm run typecheck && npm test && npm run build
MITRA_SDK_CORE_TARBALL=/path/to/mitralab.io-sdk-core-0.2.0-beta.0.tgz npm run smoke:package
git diff --exit-code -- package-lock.json
```

Do not use a `file:` dependency or `npm link`. After Core 0.2.0-beta.0 is published, install it from
the public npm registry and commit the registry `resolved` URL and integrity generated in
`package-lock.json`.

The checked-in lock records the intended Core `0.2.0-beta.0` package without a false `0.1.x`
registry
resolution. It is provisional until Core is published. `npm ci` is therefore not expected to work
from the registry before the Core release.

## Release order

1. Merge and publish `@mitralab.io/sdk-core@0.2.0-beta.0` under npm's `beta` dist-tag from its
   immutable source commit.
2. Add that full commit SHA to `contracts/sdk-core-v0.2.0-beta.0.manifest.json` as:

   ```json
   {
     "source": {
       "repository": "https://github.com/mitralab-dev/mitra-core-sdk",
       "commit": "<full-core-commit-sha>",
       "path": "contracts/v0.2.0-beta.0/sdk-parity.json"
     }
   }
   ```

3. Run `npm install --package-lock-only`, then verify that the Core lock entry is exactly
   `0.2.0-beta.0` with an npm registry URL and integrity.
4. Run `npm ci`, `npm run check`, and `npm run check:contracts:source`.
5. Publish `@mitralab.io/functions-sdk@0.2.0-beta.0` under npm's `beta` dist-tag and run the
   tarball smoke against the registry.

Stable `X.Y.Z` releases use npm's default `latest` dist-tag. The workflow accepts only that stable
form or the prerelease form `X.Y.Z-beta.N`.

`prepublishOnly` repeats the immutable-source check, so a direct `npm publish` cannot bypass the
pending Core provenance.

The contract source can be checked explicitly without changing the manifest or
lockfile:

```bash
node scripts/check-contract-corpus.mjs --canonical /path/to/sdk-parity.json
```

The package builds ESM, CommonJS, and TypeScript declarations in `dist/`. Tests enforce at least 80 percent coverage for lines, functions, branches, and statements.
