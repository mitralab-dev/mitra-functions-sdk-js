# Mitra Functions SDK for JavaScript

JavaScript and TypeScript SDK for code running inside Mitra Server Functions. It exposes the application-scoped Platform APIs that a function commonly needs without bringing browser authentication into the runtime.

The SDK uses the short-lived platform access token injected into the function runtime. It does not log in users, persist credentials, refresh tokens, use API keys, or retry requests automatically.

Shared API contracts and modules come from `@mitralab.io/sdk-core`. This package owns only the Server Function runtime adapter: environment configuration, token headers, timeout, credential redaction, redirect refusal, and one-attempt request policy. The core never receives or stores the token.

## Installation

```bash
npm install @mitralab.io/functions-sdk
```

Node.js 18 or newer is required.

## Runtime integration status

The SDK is ready for the target runtime contract, but Functions and Sandbox do not inject it yet. Until that integration is delivered, these variables must be supplied explicitly in local or controlled execution environments:

- `MITRA_API_URL`
- `MITRA_PLATFORM_ACCESS_TOKEN`
- `MITRA_APP_ID`
- `MITRA_DATA_SOURCE_ID`, when already resolved by the runtime

Do not treat user-defined function secrets as the runtime credential channel. The pending runtime integration must inject the platform access token separately from user secrets.

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

Entity operations use the app identity from the token and `X-App-Id`, so they are available immediately. Custom queries require a data source ID.

If `MITRA_DATA_SOURCE_ID` or `dataSourceId` is not configured, call `init()` once before executing queries. It resolves the data source from Code Studio and is safe to call concurrently.

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
const recent = await tasks.list({ sort: "-created_at", limit: 20 })
const pending = await tasks.filter({ status: "pending" })
const created = await tasks.create({ title: "Review order" })
await tasks.update(created.id, { status: "done" })
await tasks.delete(created.id)

const dynamic = await mitra.entities.Task.list()
```

Available methods are `list`, `filter`, `get`, `create`, `bulkCreate`, `update`, `delete`, and `deleteMany`.

### Custom queries

```typescript
await mitra.init()
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

## Errors and request behavior

API, timeout, invalid response, and network failures throw `MitraApiError`. The error exposes `status`, `code`, `details`, `requestId`, and `retryable`, preserving API metadata when it is provided. Configuration failures throw `MitraConfigurationError`.

When an API error omits `retryable`, the HTTP adapter classifies 4xx responses
as `false` and 5xx responses as `true`. This field is diagnostic classification
only. The SDK still makes one attempt and never retries a request automatically.

The Python package uses idiomatic specialized names for local failures. JavaScript `REQUEST_TIMEOUT` and `NETWORK_ERROR` map to Python `MitraNetworkError`, while JavaScript `INVALID_RESPONSE` maps to Python `MitraResponseError`. API responses use `MitraApiError` in both packages.

Every request sends `Authorization: Bearer <token>` and `X-App-Id`. The default timeout is 10 seconds. Requests are never retried automatically, which avoids replaying writes with unknown idempotency.

The access token is redacted from API error messages and error details.

## Contract parity

The test suite reads SDK-PARITY-001 directly from the installed
`@mitralab.io/sdk-core` package. The source manifest pins Core version 0.1.0,
the SHA-256 digest, and the full source commit
`d3d7a3bae3e845749e769f8e899552039ec4001a`. It does not duplicate the corpus.

The JavaScript consumer requirement is exactly `httpAdapterCases: all`. Tests
execute all recorded 404, 503, and timeout cases through the public client and
the real `HttpClient`, using a mock fetch only at the network boundary. They
verify the request and the complete error semantics. Continuous integration and
release gates also download the canonical file from the public Core repository
at the pinned commit and compare it byte for byte with the installed package.

## Scope

Version 0.1 includes application runtime operations: current user, entity CRUD, custom query execution, Server Function execution management, and integrations. Administrative control-plane methods and the legacy messenger API are intentionally excluded.

## Development

```bash
npm install
npm run check
```

During the stacked `0.1.0` bootstrap, install the locally packed core without changing this repository's manifest or lockfile:

```bash
npm install --no-save --package-lock=false ../mitralab.io-sdk-core-0.1.0.tgz
MITRA_SDK_CORE_TARBALL=../mitralab.io-sdk-core-0.1.0.tgz npm run check
```

The contract source can be checked explicitly without changing the manifest or
lockfile:

```bash
npm run check:contracts -- --canonical /path/to/sdk-parity.json
```

The relative path above is illustrative. No `file:` dependency or local tarball path is committed. Publish `@mitralab.io/sdk-core` first, then regenerate the lockfile from the npm registry before opening the consumer PR.

The package builds ESM, CommonJS, and TypeScript declarations in `dist/`. Tests enforce at least 80 percent coverage for lines, functions, branches, and statements.
