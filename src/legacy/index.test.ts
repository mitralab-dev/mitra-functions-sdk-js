import { describe, expect, it } from "vitest"
import * as legacySdk from "mitra-sdk"
import * as packageSurface from "../index"
import { createClient, getProjectsMitra, listRecordsMitra, runQueryMitra } from "../index"
import type { ListRecordsOptions, MitraConfig, RunQueryOptions } from "../index"

const surface = packageSurface as unknown as Record<string, unknown>
const legacyBindings = { ...legacySdk }
const legacyValues = Object.keys(legacyBindings).sort()

describe("legacy surface", () => {
  it("re-exports every runtime export of the pinned legacy package", () => {
    expect(legacyValues.length).toBeGreaterThan(0)
    expect(legacyValues.filter((name) => typeof surface[name] !== "function")).toEqual([])
  })

  it("re-exports the legacy bindings themselves, without wrapping them", () => {
    const rebound = legacyValues.filter(
      (name) => surface[name] !== (legacyBindings as unknown as Record<string, unknown>)[name],
    )

    expect(rebound).toEqual([])
  })

  it("resolves named imports of legacy functions", () => {
    expect(typeof getProjectsMitra).toBe("function")
    expect(typeof listRecordsMitra).toBe("function")
    expect(typeof runQueryMitra).toBe("function")
  })

  it("resolves named imports of legacy types", () => {
    const listOptions: ListRecordsOptions = { tableName: "Task", page: 0, size: 10 }
    const queryOptions: RunQueryOptions = { sql: "SELECT 1" }
    const legacyConfig: MitraConfig = { baseURL: "https://api.example.com", token: "token" }

    expect(listOptions.tableName).toBe("Task")
    expect(queryOptions.sql).toBe("SELECT 1")
    expect(legacyConfig.baseURL).toBe("https://api.example.com")
  })

  it("does not shadow the current surface", () => {
    expect(legacyValues).not.toContain("createClient")
    expect(legacyValues).not.toContain("createClientFromEnvironment")
    expect(surface.createClient).toBe(createClient)
  })

  it("does not expose browser-only interactions bindings", () => {
    expect(surface.loginMitra).toBeUndefined()
    expect(surface.loginWithGoogleMitra).toBeUndefined()
    expect(surface.loginWithMicrosoftMitra).toBeUndefined()
    expect(surface.refreshTokenSilently).toBeUndefined()
  })
})
