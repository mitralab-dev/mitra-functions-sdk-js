import { Buffer } from "node:buffer"
import { createHash } from "node:crypto"
import { log } from "node:console"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, resolve } from "node:path"
import process from "node:process"
import { fileURLToPath, URL } from "node:url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const sourceManifestPath = join(root, "contracts", "sdk-core-v0.2.0-beta.0.manifest.json")
const expectedRepository = "https://github.com/mitralab-dev/mitra-core-sdk"
const expectedPackage = "@mitralab.io/sdk-core"
const fullCommitPattern = /^[0-9a-f]{40}$/
const sha256Pattern = /^[0-9a-f]{64}$/

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex")
}

function parseJson(bytes, description) {
  try {
    return JSON.parse(bytes.toString("utf8"))
  } catch (error) {
    throw new Error(`${description} is not valid JSON`, { cause: error })
  }
}

export function loadInstalledContractCorpus() {
  const sourceManifest = parseJson(readFileSync(sourceManifestPath), "Source manifest")
  validateSourceManifest(sourceManifest, { requirePinnedSource: false })
  const adapterMetadata = parseJson(
    readFileSync(join(root, "package.json")),
    "Functions SDK package metadata",
  )
  if (adapterMetadata.dependencies?.[expectedPackage] !== sourceManifest.dependency.version) {
    throw new Error("sdk-core dependency must use the exact source manifest version")
  }
  const require = createRequire(import.meta.url)
  const coreEntry = require.resolve("@mitralab.io/sdk-core")
  const coreRoot = resolve(dirname(coreEntry), "..")
  const packageMetadata = parseJson(
    readFileSync(join(coreRoot, "package.json")),
    "Installed sdk-core package metadata",
  )
  const contractManifest = parseJson(
    readFileSync(join(coreRoot, "contracts", "manifest.json")),
    "Installed sdk-core contract manifest",
  )
  const fixturePath = join(coreRoot, sourceManifest.dependency.contractPath)
  const fixtureBytes = readFileSync(fixturePath)
  const fixture = parseJson(fixtureBytes, "Installed sdk-core contract fixture")

  if (
    packageMetadata.name !== sourceManifest.dependency.package ||
    packageMetadata.version !== sourceManifest.dependency.version
  ) {
    throw new Error("Installed sdk-core package identity does not match the source manifest")
  }
  const declared = contractManifest.versions?.find(
    (entry) => entry.version === sourceManifest.version,
  )
  if (
    contractManifest.contract !== sourceManifest.contract ||
    contractManifest.current !== sourceManifest.version ||
    declared?.path !== sourceManifest.dependency.contractPath.replace(/^contracts\//, "") ||
    declared?.sha256 !== sourceManifest.sha256
  ) {
    throw new Error("Installed sdk-core contract manifest does not match the source manifest")
  }
  const digest = sha256(fixtureBytes)
  if (
    fixture.contract !== sourceManifest.contract ||
    fixture.version !== sourceManifest.version ||
    digest !== sourceManifest.sha256
  ) {
    throw new Error("Installed sdk-core contract fixture does not match the source manifest")
  }

  return { sourceManifest, fixture, fixtureBytes, digest }
}

export function validateSourceManifest(sourceManifest, options = {}) {
  const { requirePinnedSource = true } = options
  const expectedContractPath = `contracts/v${sourceManifest.version}/sdk-parity.json`

  if (sourceManifest.dependency?.package !== expectedPackage) {
    throw new Error(`sdk-core dependency package must be exactly ${expectedPackage}`)
  }
  if (sourceManifest.dependency?.version !== sourceManifest.version) {
    throw new Error("sdk-core dependency version must match the contract version")
  }
  if (sourceManifest.dependency?.contractPath !== expectedContractPath) {
    throw new Error(`sdk-core dependency contract path must be exactly ${expectedContractPath}`)
  }
  if (!sha256Pattern.test(sourceManifest.sha256 ?? "")) {
    throw new Error("sdk-core contract sha256 must be a lowercase SHA-256 digest")
  }

  if (!sourceManifest.source) {
    if (requirePinnedSource) {
      throw new Error("sdk-core immutable source is not pinned yet")
    }
    return
  }
  if (sourceManifest.source.repository !== expectedRepository) {
    throw new Error(`sdk-core source repository must be exactly ${expectedRepository}`)
  }
  if (sourceManifest.source.path !== sourceManifest.dependency.contractPath) {
    throw new Error("sdk-core source path must match the dependency contract path")
  }
  if (!fullCommitPattern.test(sourceManifest.source.commit ?? "")) {
    throw new Error("sdk-core source commit must be a full lowercase commit SHA")
  }
}

export function canonicalSourceUrl(sourceManifest) {
  validateSourceManifest(sourceManifest)
  const repositoryPath = new URL(sourceManifest.source.repository).pathname.replace(/^\/+/, "")
  return (
    `https://raw.githubusercontent.com/${repositoryPath}/` +
    `${sourceManifest.source.commit}/${sourceManifest.source.path}`
  )
}

function canonicalArgument() {
  const index = process.argv.indexOf("--canonical")
  if (index === -1) return undefined
  const value = process.argv[index + 1]
  if (!value) throw new Error("--canonical requires a file path")
  return value
}

async function canonicalSourceBytes(sourceManifest) {
  const url = canonicalSourceUrl(sourceManifest)
  const response = await globalThis.fetch(url, { redirect: "error" })
  if (!response.ok) {
    throw new Error(`Failed to download immutable sdk-core corpus: HTTP ${response.status}`)
  }
  return Buffer.from(await response.arrayBuffer())
}

async function main() {
  const corpus = loadInstalledContractCorpus()
  const canonicalPath = canonicalArgument()
  const compareRemoteSource = process.argv.includes("--canonical-source")
  if (canonicalPath && compareRemoteSource) {
    throw new Error("Use either --canonical or --canonical-source, not both")
  }
  if (canonicalPath || compareRemoteSource) {
    const canonicalBytes = canonicalPath
      ? readFileSync(resolve(canonicalPath))
      : await canonicalSourceBytes(corpus.sourceManifest)
    if (sha256(canonicalBytes) !== corpus.digest || !canonicalBytes.equals(corpus.fixtureBytes)) {
      throw new Error("Installed sdk-core corpus differs from the immutable canonical source")
    }
  }
  log(
    `${corpus.sourceManifest.contract} ${corpus.sourceManifest.version} verified from ` +
      `${corpus.sourceManifest.source?.commit ?? "the pending release source"} (${corpus.digest})`,
  )
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : undefined
if (invokedPath === fileURLToPath(import.meta.url)) {
  await main()
}
