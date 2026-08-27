import { describe, expect, it, vi } from "vitest"
import type { AppDefinition, AppDeploy, AppsModule } from "@mitralab.io/sdk-core"
import { createAppScopedAppsModule } from "./app-scoped-apps"

const app = {
  id: "app-1",
  shortId: "runtime-app",
  subdomain: "runtime-app",
  brand: "mitra",
  domains: [],
  legacyId: null,
  name: "Runtime app",
  description: null,
  color: { type: "SOLID", hex: "#7839EE" },
  icon: null,
  dataSourceId: "data-source-1",
  planId: "plan-1",
  template: "react-vite-shadcn",
  allowSignup: true,
  externalAccessEnabled: false,
  currentVersion: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
} satisfies AppDefinition
const deploy = {
  id: "deploy-1",
  appId: "app-1",
  appVersionId: "version-1",
  status: "DEPLOYED",
  deployUrl: null,
  errorMessage: null,
  logs: null,
  durationMs: null,
  startedAt: null,
  finishedAt: null,
  createdAt: "2026-01-01T00:00:00Z",
} satisfies AppDeploy
const page = {
  content: [],
  page: { size: 20, totalElements: 0, totalPages: 0, number: 0 },
}

function appsDelegate(): AppsModule {
  return {
    list: vi.fn(async () => page),
    get: vi.fn(async () => app),
    create: vi.fn(async () => app),
    delete: vi.fn(async () => undefined),
    update: vi.fn(async () => app),
    getFiles: vi.fn(async () => ({ files: {} })),
    replaceFiles: vi.fn(async () => ({ files: {} })),
    mergeFiles: vi.fn(async () => ({ files: {} })),
    build: vi.fn(async () => deploy),
    publish: vi.fn(async () => app),
    getDeploy: vi.fn(async () => deploy),
    getCurrentDeploy: vi.fn(async () => deploy),
    cancelBuild: vi.fn(async () => deploy),
    rollback: vi.fn(async () => app),
    listDeploys: vi.fn(async () => page),
    listVersions: vi.fn(async () => page),
  }
}

describe("current-app facade", () => {
  it("binds every Code Studio operation to the configured app", async () => {
    const delegate = appsDelegate()
    const { currentApp } = createAppScopedAppsModule(delegate, "app-1")

    await currentApp.get({ version: "PUBLISHED" })
    await currentApp.delete()
    await currentApp.update({ name: "Renamed" })
    await currentApp.getFiles()
    await currentApp.replaceFiles({ "src/main.ts": "code" })
    await currentApp.mergeFiles({ "old.ts": null })
    await currentApp.build()
    await currentApp.publish({ externalAccess: true })
    await currentApp.getDeploy("deploy-1")
    await currentApp.getCurrentDeploy()
    await currentApp.cancelBuild("deploy-1")
    await currentApp.rollback("version-1")
    await currentApp.listDeploys({ page: 1 })
    await currentApp.listVersions({ page: 2 })

    expect(delegate.get).toHaveBeenCalledWith("app-1", { version: "PUBLISHED" })
    expect(delegate.update).toHaveBeenCalledWith("app-1", { name: "Renamed" })
    expect(delegate.getDeploy).toHaveBeenCalledWith("app-1", "deploy-1")
    expect(delegate.publish).toHaveBeenCalledWith("app-1", { externalAccess: true })
    expect(delegate.listDeploys).toHaveBeenCalledWith("app-1", { page: 1 })
    expect(delegate.listVersions).toHaveBeenCalledWith("app-1", { page: 2 })
  })
})
