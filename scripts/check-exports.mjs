import assert from "node:assert/strict"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const commonJs = require("../dist/index.cjs")
const esm = await import("../dist/index.js")

for (const exported of [
  "createClient",
  "createClientFromEnvironment",
  "MitraApiError",
  "MitraConfigurationError",
  "AgentTaskTurnError",
]) {
  assert.equal(typeof commonJs[exported], "function", `CommonJS export ${exported} is missing`)
  assert.equal(typeof esm[exported], "function", `ESM export ${exported} is missing`)
}

const legacy = require("mitra-sdk")

for (const [exported, binding] of Object.entries(legacy)) {
  assert.equal(commonJs[exported], binding, `CommonJS legacy export ${exported} changed identity`)
  assert.equal(typeof esm[exported], typeof binding, `ESM legacy export ${exported} is missing`)
}

for (const browserOnly of [
  "createMitraInstance",
  "exchangeSsoCodeMitra",
  "executePublicServerFunctionMitra",
  "getConfig",
  "getPublicServerFunctionExecutionMitra",
  "loginMitra",
  "loginWithGoogleMitra",
  "loginWithMicrosoftMitra",
  "refreshTokenSilently",
]) {
  assert.equal(commonJs[browserOnly], undefined, `CommonJS leaked browser export ${browserOnly}`)
  assert.equal(esm[browserOnly], undefined, `ESM leaked browser export ${browserOnly}`)
}

for (const internal of [
  "AgentConnectionsModule",
  "AgentCredentialsModule",
  "AgentsModule",
  "AgentTasksModule",
  "AppsModule",
  "AuthModule",
  "ContextModule",
  "CustomQueriesModule",
  "DataSourcesModule",
  "EntitiesModule",
  "FunctionsAdminModule",
  "FunctionsModule",
  "ImportsModule",
  "IntegrationAdminModule",
  "IntegrationModule",
  "IntegrationResourcesModule",
  "IntegrationTemplatesModule",
  "MembersModule",
  "MessengerModule",
  "PublicFunctionsModule",
  "QueriesModule",
  "SchemaModule",
  "SqlModule",
  "WorkflowsModule",
]) {
  assert.equal(commonJs[internal], undefined, `CommonJS leaked internal export ${internal}`)
  assert.equal(esm[internal], undefined, `ESM leaked internal export ${internal}`)
}
