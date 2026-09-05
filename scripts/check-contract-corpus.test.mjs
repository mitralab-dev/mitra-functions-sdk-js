import { readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { canonicalSourceUrl, validateSourceManifest } from "./check-contract-corpus.mjs"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const manifest = JSON.parse(
  readFileSync(join(root, "contracts", "sdk-core-v0.2.0-beta.1.manifest.json"), "utf8"),
)

describe("sdk-core canonical source provenance", () => {
  it("accepts the release manifest with its immutable source", () => {
    expect(() => validateSourceManifest(manifest, { requirePinnedSource: false })).not.toThrow()
    expect(() => canonicalSourceUrl(manifest)).not.toThrow()
  })

  it("derives the immutable public source URL from a full commit SHA", () => {
    const pinned = {
      ...manifest,
      source: {
        repository: "https://github.com/mitralab-dev/mitra-core-sdk",
        commit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        path: "contracts/v0.2.0-beta.1/sdk-parity.json",
      },
    }

    expect(canonicalSourceUrl(pinned)).toBe(
      "https://raw.githubusercontent.com/mitralab-dev/mitra-core-sdk/" +
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/contracts/v0.2.0-beta.1/sdk-parity.json",
    )
  })

  it.each([
    ["repository", "https://github.com/example/mitra-core-sdk"],
    ["path", "contracts/v0.2.0-beta.1/other.json"],
    ["commit", "not-a-full-commit"],
  ])("rejects a false source %s", (field, value) => {
    const mutated = {
      ...manifest,
      source: {
        repository: "https://github.com/mitralab-dev/mitra-core-sdk",
        commit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        path: "contracts/v0.2.0-beta.1/sdk-parity.json",
        [field]: value,
      },
    }

    expect(() => validateSourceManifest(mutated)).toThrow()
  })
})
