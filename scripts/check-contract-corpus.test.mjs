import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { canonicalSourceUrl, validateSourceManifest } from "./check-contract-corpus.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const manifest = JSON.parse(
  readFileSync(join(root, "contracts", "sdk-core-v0.1.0.manifest.json"), "utf8"),
)

describe("sdk-core canonical source provenance", () => {
  it("derives the immutable public source URL from the validated manifest", () => {
    expect(canonicalSourceUrl(manifest)).toBe(
      "https://raw.githubusercontent.com/mitralab-dev/mitra-sdk-core/" +
        "d3d7a3bae3e845749e769f8e899552039ec4001a/contracts/v0.1.0/sdk-parity.json",
    )
  })

  it.each([
    ["repository", "https://github.com/example/mitra-sdk-core"],
    ["path", "contracts/v0.1.0/other.json"],
    ["commit", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
  ])("rejects a false source %s", (field, value) => {
    const mutated = {
      ...manifest,
      source: { ...manifest.source, [field]: value },
    }

    expect(() => validateSourceManifest(mutated)).toThrow(
      `sdk-core source ${field} must be exactly`,
    )
  })
})
