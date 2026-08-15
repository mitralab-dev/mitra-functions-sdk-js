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
]) {
  assert.equal(typeof commonJs[exported], "function", `CommonJS export ${exported} is missing`)
  assert.equal(typeof esm[exported], "function", `ESM export ${exported} is missing`)
}

for (const internal of [
  "AuthModule",
  "EntitiesModule",
  "FunctionsModule",
  "IntegrationModule",
  "QueriesModule",
]) {
  assert.equal(commonJs[internal], undefined, `CommonJS leaked internal export ${internal}`)
  assert.equal(esm[internal], undefined, `ESM leaked internal export ${internal}`)
}
