import { execFileSync } from "node:child_process"
import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import process from "node:process"

const consumerDirectory = mkdtempSync(join(tmpdir(), "mitra-functions-sdk-smoke-"))
const typeScriptCompiler = join(process.cwd(), "node_modules", "typescript", "bin", "tsc")
const coreTarball = process.env.MITRA_SDK_CORE_TARBALL

try {
  const packOutput = execFileSync(
    "npm",
    ["pack", "--json", "--pack-destination", consumerDirectory],
    { encoding: "utf8" },
  )
  const [{ filename }] = JSON.parse(packOutput)
  const tarball = join(consumerDirectory, filename)

  writeFileSync(
    join(consumerDirectory, "package.json"),
    JSON.stringify({ name: "sdk-smoke-consumer", private: true, type: "module" }),
  )
  execFileSync(
    "npm",
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
    'import { createClient, type MitraClient, type Plan } from "@mitralab.io/functions-sdk"\nconst plan: Plan = { id: "plan-1", name: "Free" }\nconst client: MitraClient = createClient({ apiUrl: "https://api.example.com", accessToken: "token", appId: "app" })\nvoid client\nvoid plan\n',
  )
  writeFileSync(
    join(consumerDirectory, "consumer.cts"),
    'import sdk = require("@mitralab.io/functions-sdk")\nconst plan: import("@mitralab.io/functions-sdk").Plan = { id: "plan-1", name: "Free" }\nconst client: import("@mitralab.io/functions-sdk").MitraClient = sdk.createClient({ apiUrl: "https://api.example.com", accessToken: "token", appId: "app" })\nvoid client\nvoid plan\n',
  )
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
    ],
    { cwd: consumerDirectory, stdio: "inherit" },
  )
  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      'import { createClient, createClientFromEnvironment, MitraApiError, MitraConfigurationError } from "@mitralab.io/functions-sdk"; if (![createClient, createClientFromEnvironment, MitraApiError, MitraConfigurationError].every((value) => typeof value === "function")) process.exit(1)',
    ],
    { cwd: consumerDirectory, stdio: "inherit" },
  )
  execFileSync(
    process.execPath,
    [
      "--eval",
      'const sdk = require("@mitralab.io/functions-sdk"); if (![sdk.createClient, sdk.createClientFromEnvironment, sdk.MitraApiError, sdk.MitraConfigurationError].every((value) => typeof value === "function")) process.exit(1)',
    ],
    { cwd: consumerDirectory, stdio: "inherit" },
  )
} finally {
  rmSync(consumerDirectory, { recursive: true, force: true })
}
