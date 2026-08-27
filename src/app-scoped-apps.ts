import type {
  AppDefinition,
  AppDeploy,
  AppFiles,
  AppGetOptions,
  AppsModule,
  AppPublishOptions,
  AppUpdateInput,
  AppVersion,
  Page,
  PageOptions,
} from "@mitralab.io/sdk-core"
import { MitraConfigurationError } from "./errors"

export type AppScopedAppsModule = AppsModule

export interface CurrentAppModule {
  /** Gets the runtime app, optionally selecting its DRAFT or PUBLISHED version. */
  get(options?: AppGetOptions): Promise<AppDefinition>
  delete(): Promise<void>
  update(input: AppUpdateInput): Promise<AppDefinition>
  getFiles(): Promise<AppFiles>
  replaceFiles(files: Record<string, string>): Promise<AppFiles>
  mergeFiles(files: Record<string, string | null>): Promise<AppFiles>
  /** Starts a preview build and returns the deploy that can be polled with `getDeploy`. */
  build(): Promise<AppDeploy>
  /** Builds and publishes the current DRAFT, optionally updating external access. */
  publish(options?: AppPublishOptions): Promise<AppDefinition>
  getDeploy(deployId: string): Promise<AppDeploy>
  getCurrentDeploy(): Promise<AppDeploy | null>
  cancelBuild(deployId: string): Promise<AppDeploy>
  rollback(targetVersionId: string): Promise<AppDefinition>
  listDeploys(options?: PageOptions): Promise<Page<AppDeploy>>
  listVersions(options?: PageOptions): Promise<Page<AppVersion>>
}

function unavailable(operation: string): never {
  throw new MitraConfigurationError(
    `apps.${operation} is not available in an app-scoped Functions runtime`,
  )
}

function assertCurrentApp(configuredAppId: string, requestedAppId: string): void {
  if (requestedAppId !== configuredAppId) {
    throw new MitraConfigurationError(
      `Code Studio access is fixed to app ${configuredAppId}; received ${requestedAppId}`,
    )
  }
}

export function createAppScopedAppsModule(
  apps: AppsModule,
  appId: string,
): { apps: AppScopedAppsModule; currentApp: CurrentAppModule } {
  const scoped: AppScopedAppsModule = {
    async list() {
      return unavailable("list")
    },
    async get(requestedAppId, options) {
      assertCurrentApp(appId, requestedAppId)
      return apps.get(appId, options)
    },
    async create() {
      return unavailable("create")
    },
    async delete(requestedAppId) {
      assertCurrentApp(appId, requestedAppId)
      return apps.delete(appId)
    },
    async update(requestedAppId, input) {
      assertCurrentApp(appId, requestedAppId)
      return apps.update(appId, input)
    },
    async getFiles(requestedAppId) {
      assertCurrentApp(appId, requestedAppId)
      return apps.getFiles(appId)
    },
    async replaceFiles(requestedAppId, files) {
      assertCurrentApp(appId, requestedAppId)
      return apps.replaceFiles(appId, files)
    },
    async mergeFiles(requestedAppId, files) {
      assertCurrentApp(appId, requestedAppId)
      return apps.mergeFiles(appId, files)
    },
    async build(requestedAppId) {
      assertCurrentApp(appId, requestedAppId)
      return apps.build(appId)
    },
    async publish(requestedAppId, options) {
      assertCurrentApp(appId, requestedAppId)
      return apps.publish(appId, options)
    },
    async getDeploy(requestedAppId, deployId) {
      assertCurrentApp(appId, requestedAppId)
      return apps.getDeploy(appId, deployId)
    },
    async getCurrentDeploy(requestedAppId) {
      assertCurrentApp(appId, requestedAppId)
      return apps.getCurrentDeploy(appId)
    },
    async cancelBuild(requestedAppId, deployId) {
      assertCurrentApp(appId, requestedAppId)
      return apps.cancelBuild(appId, deployId)
    },
    async rollback(requestedAppId, targetVersionId) {
      assertCurrentApp(appId, requestedAppId)
      return apps.rollback(appId, targetVersionId)
    },
    async listDeploys(requestedAppId, options) {
      assertCurrentApp(appId, requestedAppId)
      return apps.listDeploys(appId, options)
    },
    async listVersions(requestedAppId, options) {
      assertCurrentApp(appId, requestedAppId)
      return apps.listVersions(appId, options)
    },
  }

  return {
    apps: scoped,
    currentApp: {
      get: (options) => scoped.get(appId, options),
      delete: () => scoped.delete(appId),
      update: (input) => scoped.update(appId, input),
      getFiles: () => scoped.getFiles(appId),
      replaceFiles: (files) => scoped.replaceFiles(appId, files),
      mergeFiles: (files) => scoped.mergeFiles(appId, files),
      build: () => scoped.build(appId),
      publish: (options) => scoped.publish(appId, options),
      getDeploy: (deployId) => scoped.getDeploy(appId, deployId),
      getCurrentDeploy: () => scoped.getCurrentDeploy(appId),
      cancelBuild: (deployId) => scoped.cancelBuild(appId, deployId),
      rollback: (targetVersionId) => scoped.rollback(appId, targetVersionId),
      listDeploys: (options) => scoped.listDeploys(appId, options),
      listVersions: (options) => scoped.listVersions(appId, options),
    },
  }
}
