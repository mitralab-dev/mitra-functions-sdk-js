import { execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import process from "node:process"

const consumerDirectory = mkdtempSync(join(tmpdir(), "mitra-functions-sdk-smoke-"))
const typeScriptCompiler = join(process.cwd(), "node_modules", "typescript", "bin", "tsc")
const coreTarball = process.env.MITRA_SDK_CORE_TARBALL
const npmCli =
  process.env.npm_execpath ??
  join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")

if (!existsSync(npmCli)) {
  throw new Error("npm CLI was not found; run this smoke test through an npm script")
}

function npm(args, options = {}) {
  return execFileSync(process.execPath, [npmCli, ...args], options)
}

try {
  const packOutput = npm(["pack", "--json", "--pack-destination", consumerDirectory], {
    encoding: "utf8",
  })
  const [{ filename }] = JSON.parse(packOutput)
  const tarball = join(consumerDirectory, filename)

  writeFileSync(
    join(consumerDirectory, "package.json"),
    JSON.stringify({ name: "sdk-smoke-consumer", private: true, type: "module" }),
  )
  npm(
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      ...(coreTarball ? [coreTarball] : []),
      tarball,
    ],
    {
      cwd: consumerDirectory,
      stdio: "inherit",
    },
  )
  writeFileSync(
    join(consumerDirectory, "consumer.mts"),
    'import { AgentTaskTurnError, createClient, type AgentConnection, type AgentMessage, type AgentModel, type AgentTurnResult, type AppCreateInput, type CoreAgentConnection, type CoreAgentMessage, type CoreAgentModel, type CoreAgentTaskSessionOptions, type CoreListTablesOptions, type FunctionBulkCreateInput, type FunctionBulkPatchInput, type FunctionCreateInput, type IntegrationFieldSchemaInput, type ListTablesOptions, type MitraClient } from "@mitralab.io/functions-sdk"\nconst app: AppCreateInput = { name: "App" }\nconst fn: FunctionCreateInput = { name: "Run", runtime: "JAVASCRIPT", code: "return {}", cronExpression: "0 0 9 * * *", cronInputJson: { source: "cron" }, cronEnabled: true }\nconst bulkCreate: FunctionBulkCreateInput = { name: "Run", runtime: "JAVASCRIPT", code: "return {}" }\nconst bulkPatch: FunctionBulkPatchInput = { description: "Updated" }\nconst inlineField: IntegrationFieldSchemaInput = { key: "apiToken", label: "API token", type: "secret", required: true }\nconst sessionOptions: CoreAgentTaskSessionOptions = { taskId: "task-1", transport: "http" }\nconst legacyTypes = {} as { connection: AgentConnection; message: AgentMessage; model: AgentModel; tables: ListTablesOptions }\nconst coreTypes = {} as { connection: CoreAgentConnection; message: CoreAgentMessage; model: CoreAgentModel; tables: CoreListTablesOptions; result: AgentTurnResult }\nconst client: MitraClient = createClient({ apiUrl: "https://api.example.com", accessToken: "token", appId: "app" })\nconst session = client.agentTasks.session(sessionOptions)\nvoid [AgentTaskTurnError, client.agentConnections, client.agentCredentials, client.agents, client.agentTasks, client.apps, client.auth, client.context, client.currentApp, client.customQueries, client.dataSources, client.entities, client.functions, client.functionsAdmin, client.imports, client.integration, client.integrationAdmin, client.integrationAdmin.list, client.integrationResources, client.integrationTemplates, client.members, client.messenger, client.publicFunctions, client.queries, client.schema, client.sql, client.workflows, session, session.sendAndWait, app, fn, bulkCreate, bulkPatch, inlineField, legacyTypes, coreTypes]\n',
  )
  writeFileSync(
    join(consumerDirectory, "consumer.cts"),
    'import sdk = require("@mitralab.io/functions-sdk")\nconst input: import("@mitralab.io/functions-sdk").AgentTaskCreateInput = { agentType: "CODEX" }\nconst scheduledFunction: import("@mitralab.io/functions-sdk").FunctionCreateInput = { name: "Run", runtime: "JAVASCRIPT", code: "return {}", cronExpression: "0 0 9 * * *", cronEnabled: true }\nconst bulkCreate: import("@mitralab.io/functions-sdk").FunctionBulkCreateInput = { name: "Run", runtime: "JAVASCRIPT", code: "return {}" }\nconst bulkPatch: import("@mitralab.io/functions-sdk").FunctionBulkPatchInput = { description: "Updated" }\nconst sessionOptions: import("@mitralab.io/functions-sdk").CoreAgentTaskSessionOptions = { taskId: "task-1", transport: "http" }\nconst client: import("@mitralab.io/functions-sdk").MitraClient = sdk.createClient({ apiUrl: "https://api.example.com", accessToken: "token", appId: "app" })\nconst session = client.agentTasks.session(sessionOptions)\nvoid [client.currentApp, client.publicFunctions, client.agentTasks, client.integrationAdmin.list, client.messenger, session, input, scheduledFunction, bulkCreate, bulkPatch]\n',
  )
  for (const extension of ["mts", "cts"]) {
    writeFileSync(
      join(consumerDirectory, `providers.${extension}`),
      `import { createClient, type AiProviders, type AiProvidersModule, type IncludedAiQuota, type IncludedAiQuotaWindow, type ManagedAiProfile, type OpencodeAiProvider } from "@mitralab.io/functions-sdk"
const client = createClient({ apiUrl: "https://api.example.com", accessToken: "token", appId: "app" })
const providers: AiProvidersModule = client.aiProviders
async function readProviders(): Promise<AiProviders> {
  const result = await providers.get()
  const profile: ManagedAiProfile | null | undefined = result.managedAiProfile
  const quota: IncludedAiQuota | null = result.includedAiQuota
  const day: IncludedAiQuotaWindow | undefined = quota?.windows.day
  const opencode: OpencodeAiProvider = result.opencode
  void [profile, day, opencode]
  return result
}
void readProviders
`,
    )
  }
  execFileSync(
    process.execPath,
    [
      typeScriptCompiler,
      "--noEmit",
      "--strict",
      "--skipLibCheck",
      "--target",
      "ES2022",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      "consumer.mts",
      "consumer.cts",
      "providers.mts",
      "providers.cts",
    ],
    { cwd: consumerDirectory, stdio: "inherit" },
  )
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      'import { AgentTaskTurnError, createClient, createClientFromEnvironment, MitraApiError, MitraConfigurationError } from "@mitralab.io/functions-sdk"; if (![AgentTaskTurnError, createClient, createClientFromEnvironment, MitraApiError, MitraConfigurationError].every((value) => typeof value === "function")) process.exit(1)',
    ],
    { cwd: consumerDirectory, stdio: "inherit" },
  )
  for (const moduleType of ["module", "commonjs"]) {
    execFileSync(
      process.execPath,
      [
        `--input-type=${moduleType}`,
        "--eval",
        `${moduleType === "module" ? 'import * as sdk from "@mitralab.io/functions-sdk"' : 'const sdk = require("@mitralab.io/functions-sdk")'}
const client = sdk.createClient({ apiUrl: "https://api.example.com", accessToken: "token", appId: "app", fetch: () => { throw new Error("Unexpected request") } })
if (typeof client.aiProviders?.get !== "function") throw new Error("aiProviders.get is missing from the installed package")
`,
      ],
      { cwd: consumerDirectory, stdio: "inherit" },
    )
  }
  execFileSync(
    process.execPath,
    [
      "--eval",
      'const sdk = require("@mitralab.io/functions-sdk"); if (![sdk.AgentTaskTurnError, sdk.createClient, sdk.createClientFromEnvironment, sdk.MitraApiError, sdk.MitraConfigurationError].every((value) => typeof value === "function")) process.exit(1)',
    ],
    { cwd: consumerDirectory, stdio: "inherit" },
  )
} finally {
  rmSync(consumerDirectory, { recursive: true, force: true })
}
