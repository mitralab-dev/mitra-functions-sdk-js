/**
 * Backward compatible surface of the legacy `mitra-sdk` package.
 *
 * Every export here is the legacy binding itself, re-exported unchanged and marked
 * `@deprecated` so existing Server Function code keeps working while the new
 * `@mitralab.io` family grows. Nothing in this module wraps, adapts, or renames a
 * legacy API.
 *
 * The legacy SDK talks to the platform through the BFF gateway, whose routes live
 * under `/agentAiShortcut` and `/interactions`. The native client derives `/iam`,
 * `/functions`, and the other direct-to-service prefixes from the same platform
 * origin without using the BFF. Deprecated bindings use the separate legacy base URL.
 *
 * `createClient()` wires the legacy SDK to the same runtime environment, so legacy
 * Server Function code runs without reading the environment itself.
 */

import * as legacy from "mitra-sdk"

// Client configuration

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * `createClient()` from this package already configures the legacy SDK from the same environment.
 * Call this only to override that configuration; it is still supported.
 */
export const configureSdkMitra = legacy.configureSdkMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `createClient()` for the new surface. The legacy standalone instance has no equivalent. There
 * is no replacement yet; this API is still supported.
 */
export const createMitraSdkInstance = legacy.createMitraSdkInstance

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Legacy project id helper. There is no replacement yet; this API is still supported.
 */
export const resolveProjectId = legacy.resolveProjectId

/** @deprecated Configuration type of the legacy `mitra-sdk` client. */
export type MitraConfig = legacy.MitraConfig

/** @deprecated Configuration type of the legacy `mitra-sdk` client. */
export type MitraSdkInstance = legacy.MitraSdkInstance

// Records (dynamic schema CRUD)

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.entities.<Table>.create` instead.
 */
export const createRecordMitra = legacy.createRecordMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.entities.<Table>.bulkCreate` instead.
 */
export const createRecordsBatchMitra = legacy.createRecordsBatchMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.entities.<Table>.get` instead.
 */
export const getRecordMitra = legacy.getRecordMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.entities.<Table>.list` or `mitra.entities.<Table>.filter` instead.
 */
export const listRecordsMitra = legacy.listRecordsMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.entities.<Table>.update` instead.
 */
export const updateRecordMitra = legacy.updateRecordMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.entities.<Table>.update` instead.
 */
export const patchRecordMitra = legacy.patchRecordMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.entities.<Table>.delete` instead.
 */
export const deleteRecordMitra = legacy.deleteRecordMitra

/** @deprecated Legacy record type. Use `mitra.entities` instead. */
export type CreateRecordOptions = legacy.CreateRecordOptions

/** @deprecated Legacy record type. Use `mitra.entities` instead. */
export type CreateRecordsBatchOptions = legacy.CreateRecordsBatchOptions

/** @deprecated Legacy record type. Use `mitra.entities` instead. */
export type DeleteRecordOptions = legacy.DeleteRecordOptions

/** @deprecated Legacy record type. Use `mitra.entities` instead. */
export type GetRecordOptions = legacy.GetRecordOptions

/** @deprecated Legacy record type. Use `mitra.entities` instead. */
export type ListRecordsOptions = legacy.ListRecordsOptions

/** @deprecated Legacy record type. Use `mitra.entities` instead. */
export type ListRecordsResponse = legacy.ListRecordsResponse

/** @deprecated Legacy record type. Use `mitra.entities` instead. */
export type PatchRecordOptions = legacy.PatchRecordOptions

/** @deprecated Legacy record type. Use `mitra.entities` instead. */
export type UpdateRecordOptions = legacy.UpdateRecordOptions

// Server Function execution

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.functions.execute` instead.
 */
export const executeServerFunctionMitra = legacy.executeServerFunctionMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.functions.executeAsync` instead.
 */
export const executeServerFunctionAsyncMitra = legacy.executeServerFunctionAsyncMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.functions.getExecution` instead.
 */
export const getServerFunctionExecutionMitra = legacy.getServerFunctionExecutionMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.functions.cancelExecution` instead.
 */
export const stopServerFunctionExecutionMitra = legacy.stopServerFunctionExecutionMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.publicFunctions.executeAsync` and `mitra.publicFunctions.getExecution` instead.
 * Both native methods use the direct anonymous Functions API.
 */
export const executePublicServerFunctionAsyncMitra = legacy.executePublicServerFunctionAsyncMitra

/** @deprecated Legacy Server Function execution type. Use `mitra.functions` instead. */
export type ExecuteServerFunctionOptions = legacy.ExecuteServerFunctionOptions

/** @deprecated Legacy Server Function execution type. Use `mitra.functions` instead. */
export type ExecuteServerFunctionResponse = legacy.ExecuteServerFunctionResponse

/** @deprecated Legacy Server Function execution type. Use `mitra.functions` instead. */
export type ExecuteServerFunctionAsyncOptions = legacy.ExecuteServerFunctionAsyncOptions

/** @deprecated Legacy Server Function execution type. Use `mitra.functions` instead. */
export type ExecuteServerFunctionAsyncResponse = legacy.ExecuteServerFunctionAsyncResponse

/** @deprecated Legacy Server Function execution type. Use `mitra.functions` instead. */
export type GetServerFunctionExecutionOptions = legacy.GetServerFunctionExecutionOptions

/** @deprecated Legacy Server Function execution type. Use `mitra.functions` instead. */
export type GetServerFunctionExecutionResponse = legacy.GetServerFunctionExecutionResponse

/** @deprecated Legacy Server Function execution type. Use `mitra.functions` instead. */
export type StopServerFunctionExecutionOptions = legacy.StopServerFunctionExecutionOptions

/** @deprecated Legacy Server Function execution type. Use `mitra.functions` instead. */
export type StopServerFunctionExecutionResponse = legacy.StopServerFunctionExecutionResponse

/** @deprecated Legacy Server Function execution type. Use `mitra.functions` instead. */
export type ExecutePublicServerFunctionOptions = legacy.ExecutePublicServerFunctionOptions

/** @deprecated Legacy Server Function execution type. Use `mitra.functions` instead. */
export type ExecutePublicServerFunctionAsyncResponse =
  legacy.ExecutePublicServerFunctionAsyncResponse

// Integrations

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.integration.execute` instead.
 */
export const callIntegrationMitra = legacy.callIntegrationMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.integrationAdmin.list` instead. It returns the native paginated config shape rather
 * than the legacy BFF envelope.
 */
export const listIntegrationsMitra = legacy.listIntegrationsMitra

/** @deprecated Legacy integration type. Use `mitra.integration` instead. */
export type CallIntegrationOptions = legacy.CallIntegrationOptions

/** @deprecated Legacy integration type. Use `mitra.integration` instead. */
export type CallIntegrationResponse = legacy.CallIntegrationResponse

/** @deprecated Legacy integration type. Use `mitra.integration` instead. */
export type IntegrationResponse = legacy.IntegrationResponse

/** @deprecated Legacy integration type. Use `mitra.integration` instead. */
export type ListIntegrationsOptions = legacy.ListIntegrationsOptions

// Builder: projects

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.apps.list` in a tenant-scoped client. Functions runtimes reject this tenant-level
 * operation because they are fixed to one app, and the native response shape differs.
 */
export const getProjectsMitra = legacy.getProjectsMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.context.getAppContext` instead. The native method composes safe app-scoped summaries
 * and returns the native context shape.
 */
export const getProjectContextMitra = legacy.getProjectContextMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.apps.list` in a tenant-scoped client. Functions runtimes reject this tenant-level
 * operation because they are fixed to one app, and pagination differs.
 */
export const listProjectsMitra = legacy.listProjectsMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.apps.create` in a tenant-scoped client. Functions runtimes reject app creation, and
 * the native input and response types differ from the legacy project contract.
 */
export const createProjectMitra = legacy.createProjectMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.currentApp.update` instead. It updates only native app metadata and returns an
 * `AppDefinition`, not the legacy project settings envelope.
 */
export const updateProjectSettingsMitra = legacy.updateProjectSettingsMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const getGitConfigMitra = legacy.getGitConfigMitra

/**
 * @deprecated Legacy project creation type. Use `AppCreateInput`; native app creation is not
 * available in the app-scoped Functions runtime and the fields differ.
 */
export type CreateProjectOptions = legacy.CreateProjectOptions

/**
 * @deprecated Legacy project creation response. Use `AppDefinition`; its native shape differs.
 */
export type CreateProjectResponse = legacy.CreateProjectResponse

/**
 * @deprecated Legacy project context input. Use `AppGetOptions`; native app context comes from `context.getAppContext()`.
 */
export type GetProjectContextOptions = legacy.GetProjectContextOptions

/**
 * @deprecated Legacy project context response. Use `AppContext`; it contains safe native summaries.
 */
export type GetProjectContextResponse = legacy.GetProjectContextResponse

/**
 * @deprecated Legacy project collection response. Use `Page<AppSummary>` from `apps.list`.
 */
export type GetProjectsResponse = legacy.GetProjectsResponse

/**
 * @deprecated Legacy project list input. Use `AppListOptions`; tenant-level listing is unavailable
 * in the app-scoped Functions runtime.
 */
export type ListProjectsOptions = legacy.ListProjectsOptions

/**
 * @deprecated Legacy project list response. Use `Page<AppSummary>`; pagination and fields differ.
 */
export type ListProjectsResponse = legacy.ListProjectsResponse

/**
 * @deprecated Legacy project settings input. Use `AppUpdateInput`; unsupported legacy settings are
 * not silently translated.
 */
export type UpdateProjectSettingsOptions = legacy.UpdateProjectSettingsOptions

/**
 * @deprecated Legacy project settings response. Use `AppDefinition`.
 */
export type UpdateProjectSettingsResponse = legacy.UpdateProjectSettingsResponse

/**
 * @deprecated Legacy Git configuration type. There is no native replacement; this API remains
 * supported through the legacy bridge.
 */
export type GetGitConfigOptions = legacy.GetGitConfigOptions

/**
 * @deprecated Legacy Git configuration response. There is no native replacement; this API remains
 * supported through the legacy bridge.
 */
export type GetGitConfigResponse = legacy.GetGitConfigResponse

// Builder: JDBC connections

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.dataSources.create` instead. The native authoring API accepts EXTERNAL Data Sources
 * only and uses `ConnectionConfig`, not the legacy JDBC payload.
 */
export const createJdbcConnectionMitra = legacy.createJdbcConnectionMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.dataSources.list` instead. It returns a native page without the legacy BFF envelope.
 */
export const listJdbcConnectionsMitra = legacy.listJdbcConnectionsMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.dataSources.update` instead. The native method replaces the supplied connection
 * configuration and accepts EXTERNAL Data Sources only.
 */
export const updateJdbcConnectionMitra = legacy.updateJdbcConnectionMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.dataSources.delete` instead. The native method uses the Data Source UUID directly.
 */
export const deleteJdbcConnectionMitra = legacy.deleteJdbcConnectionMitra

/**
 * @deprecated Legacy JDBC create input. Use `DataSourceCreateInput`; the native API supports
 * EXTERNAL Data Sources and a different connection shape.
 */
export type CreateJdbcConnectionOptions = legacy.CreateJdbcConnectionOptions

/**
 * @deprecated Legacy JDBC create response. Use `DataSourceDefinition`.
 */
export type CreateJdbcConnectionResponse = legacy.CreateJdbcConnectionResponse

/**
 * @deprecated Legacy JDBC delete input. Use the native Data Source UUID directly.
 */
export type DeleteJdbcConnectionOptions = legacy.DeleteJdbcConnectionOptions

/**
 * @deprecated Legacy JDBC delete response. `dataSources.delete` resolves with no response body.
 */
export type DeleteJdbcConnectionResponse = legacy.DeleteJdbcConnectionResponse

/**
 * @deprecated Legacy JDBC list input. Use `PageOptions` with `dataSources.list`.
 */
export type ListJdbcConnectionsOptions = legacy.ListJdbcConnectionsOptions

/**
 * @deprecated Legacy JDBC list response. Use `Page<DataSourceDefinition>`.
 */
export type ListJdbcConnectionsResponse = legacy.ListJdbcConnectionsResponse

/**
 * @deprecated Legacy JDBC update input. Use `DataSourceUpdateInput`; fields and replacement
 * semantics differ.
 */
export type UpdateJdbcConnectionOptions = legacy.UpdateJdbcConnectionOptions

/**
 * @deprecated Legacy JDBC update response. Use `DataSourceDefinition`.
 */
export type UpdateJdbcConnectionResponse = legacy.UpdateJdbcConnectionResponse

// Builder: raw SQL

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.sql.executeQuery` instead. It runs against the runtime app Data Source and returns the
 * native query result rather than the legacy BFF envelope.
 */
export const runQueryMitra = legacy.runQueryMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.sql.executeDdl` instead. The native API accepts a batch of typed DDL statements and
 * returns per-statement results.
 */
export const runDdlMitra = legacy.runDdlMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.sql.executeDml` instead. The native API accepts a batch of typed DML statements and
 * returns per-statement results.
 */
export const runDmlMitra = legacy.runDmlMitra

/**
 * @deprecated Legacy raw-query input. Call `mitra.sql.executeQuery(sql, parameters)` directly.
 */
export type RunQueryOptions = legacy.RunQueryOptions

/**
 * @deprecated Legacy raw-query response. Use `QueryResult`.
 */
export type RunQueryResponse = legacy.RunQueryResponse

/**
 * @deprecated Legacy DDL input. Use `DdlStatement[]` with `mitra.sql.executeDdl`.
 */
export type RunDdlOptions = legacy.RunDdlOptions

/**
 * @deprecated Legacy DDL response. Use `BatchExecution`.
 */
export type RunDdlResponse = legacy.RunDdlResponse

/**
 * @deprecated Legacy DML input. Use `DmlStatement[]` with `mitra.sql.executeDml`.
 */
export type RunDmlOptions = legacy.RunDmlOptions

/**
 * @deprecated Legacy DML response. Use `BatchExecution`.
 */
export type RunDmlResponse = legacy.RunDmlResponse

// Builder: tables

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.schema.listTables` instead. Its native filters and response shape differ from the
 * legacy project-scoped payload.
 */
export const listTablesMitra = legacy.listTablesMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.customQueries.create({ name, sql, isVirtualTable: true, connectionId })` instead.
 * Map legacy `sqlQuery` to `sql` and `jdbcId` to `connectionId`; the native response uses UUIDs.
 */
export const createOnlineTableMitra = legacy.createOnlineTableMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.customQueries.list` and keep entries whose `isVirtualTable` is true. The native page
 * uses UUIDs and does not include SQL; call `get(id)` when the query definition is required.
 */
export const listOnlineTablesMitra = legacy.listOnlineTablesMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.customQueries.update(id, { name, sql, isVirtualTable, connectionId })` instead. The
 * native method identifies the Virtual Table by UUID rather than by name.
 */
export const updateOnlineTableMitra = legacy.updateOnlineTableMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.customQueries.delete(id)` instead. The native method identifies the Virtual Table by
 * UUID and returns no legacy response envelope.
 */
export const deleteOnlineTableMitra = legacy.deleteOnlineTableMitra

/**
 * @deprecated Legacy table-list input preserved under its original name. Use
 * `CoreListTablesOptions` with `mitra.schema.listTables`; scopes and response shapes differ.
 */
export type ListTablesOptions = legacy.ListTablesOptions

/**
 * @deprecated Legacy table-list response. Use `SchemaTables[]`.
 */
export type ListTablesResponse = legacy.ListTablesResponse

/**
 * @deprecated Legacy online-table create input. Use `CustomQueryInput`, mapping `sqlQuery` to
 * `sql`, `jdbcId` to `connectionId`, and setting `isVirtualTable: true`.
 */
export type CreateOnlineTableOptions = legacy.CreateOnlineTableOptions

/**
 * @deprecated Legacy online-table create response. Use `CustomQueryDefinition`.
 */
export type CreateOnlineTableResponse = legacy.CreateOnlineTableResponse

/**
 * @deprecated Legacy online-table delete input. Pass the native query UUID to
 * `customQueries.delete`.
 */
export type DeleteOnlineTableOptions = legacy.DeleteOnlineTableOptions

/**
 * @deprecated Legacy online-table delete response. `customQueries.delete` has no response body.
 */
export type DeleteOnlineTableResponse = legacy.DeleteOnlineTableResponse

/**
 * @deprecated Legacy online-table list input. Use `PageOptions` with `customQueries.list`.
 */
export type ListOnlineTablesOptions = legacy.ListOnlineTablesOptions

/**
 * @deprecated Legacy online-table list response. Use `Page<CustomQuerySummary>` and filter
 * `isVirtualTable`.
 */
export type ListOnlineTablesResponse = legacy.ListOnlineTablesResponse

/**
 * @deprecated Legacy online-table update input. Use `CustomQueryUpdateInput` with the native query
 * UUID and keep `isVirtualTable: true`.
 */
export type UpdateOnlineTableOptions = legacy.UpdateOnlineTableOptions

/**
 * @deprecated Legacy online-table update response. Use `CustomQueryDefinition`.
 */
export type UpdateOnlineTableResponse = legacy.UpdateOnlineTableResponse

// Builder: Server Function CRUD

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.functionsAdmin.create` instead. The native input names the runtime explicitly and
 * returns the complete Function definition.
 */
export const createServerFunctionMitra = legacy.createServerFunctionMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.functionsAdmin.get` instead. It returns the native Function and current version DTO.
 */
export const readServerFunctionMitra = legacy.readServerFunctionMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.functionsAdmin.list` instead. It is paginated and does not return the legacy envelope.
 */
export const listServerFunctionsMitra = legacy.listServerFunctionsMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.functionsAdmin.patch`; it preserves fields omitted from the partial update.
 */
export const updateServerFunctionMitra = legacy.updateServerFunctionMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.functionsAdmin.delete` instead. It returns no legacy response envelope.
 */
export const deleteServerFunctionMitra = legacy.deleteServerFunctionMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.functionsAdmin.setVisibility` instead. Map the legacy toggle to `PUBLIC` or `PRIVATE`.
 */
export const togglePublicExecutionMitra = legacy.togglePublicExecutionMitra

/**
 * @deprecated Legacy Function create input. Use `FunctionCreateInput`; runtime and data-source
 * semantics are explicit in the native type.
 */
export type CreateServerFunctionOptions = legacy.CreateServerFunctionOptions

/**
 * @deprecated Legacy Function create response. Use `FunctionDefinition`.
 */
export type CreateServerFunctionResponse = legacy.CreateServerFunctionResponse

/**
 * @deprecated Legacy Function delete input. Pass the Function UUID to `functionsAdmin.delete`.
 */
export type DeleteServerFunctionOptions = legacy.DeleteServerFunctionOptions

/**
 * @deprecated Legacy Function delete response. The native delete has no response body.
 */
export type DeleteServerFunctionResponse = legacy.DeleteServerFunctionResponse

/**
 * @deprecated Legacy Function list input. Use `FunctionListOptions`.
 */
export type ListServerFunctionsOptions = legacy.ListServerFunctionsOptions

/**
 * @deprecated Legacy Function list response. Use `Page<FunctionSummary>`.
 */
export type ListServerFunctionsResponse = legacy.ListServerFunctionsResponse

/**
 * @deprecated Legacy Function read input. Pass the Function UUID to `functionsAdmin.get`.
 */
export type ReadServerFunctionOptions = legacy.ReadServerFunctionOptions

/**
 * @deprecated Legacy Function read response. Use `FunctionDefinition`.
 */
export type ReadServerFunctionResponse = legacy.ReadServerFunctionResponse

/**
 * @deprecated Legacy Function update input. Use `FunctionPatchInput`; the native single-Function
 * surface preserves omitted fields through PATCH.
 */
export type UpdateServerFunctionOptions = legacy.UpdateServerFunctionOptions

/**
 * @deprecated Legacy Function update response. Use `FunctionDefinition`.
 */
export type UpdateServerFunctionResponse = legacy.UpdateServerFunctionResponse

/**
 * @deprecated Legacy visibility toggle input. Use `FunctionVisibility` with
 * `functionsAdmin.setVisibility`.
 */
export type TogglePublicExecutionOptions = legacy.TogglePublicExecutionOptions

/**
 * @deprecated Legacy visibility toggle response. Use `FunctionDefinition`.
 */
export type TogglePublicExecutionResponse = legacy.TogglePublicExecutionResponse

// Builder: integration configuration

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.integrationAdmin.create` instead. The native method consumes a template UUID, alias,
 * and complete values map rather than the legacy authorization structure.
 */
export const createIntegrationMitra = legacy.createIntegrationMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.integrationAdmin.update` instead. Omitting `values` preserves stored credentials.
 */
export const updateIntegrationMitra = legacy.updateIntegrationMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.integrationAdmin.delete` instead. It returns no legacy response envelope.
 */
export const deleteIntegrationMitra = legacy.deleteIntegrationMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.integrationAdmin.testCredentials` instead. The native method tests a template and
 * values map without storing them and returns `ConnectionTestResult`.
 */
export const testIntegrationMitra = legacy.testIntegrationMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.integrationAdmin.testConfig` instead. It tests an already stored config by UUID.
 */
export const testIntegrationByIdMitra = legacy.testIntegrationByIdMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.integrationTemplates.list` instead. It is paginated and returns native summaries.
 */
export const listIntegrationTemplatesMitra = legacy.listIntegrationTemplatesMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.integrationTemplates.get` instead. The native template schema differs from the legacy
 * connector template response.
 */
export const getIntegrationTemplateMitra = legacy.getIntegrationTemplateMitra

/**
 * @deprecated Legacy integration authorization fields. Use the native template field schema and
 * a values map; credentials remain write-only.
 */
export type AuthorizationConfig = legacy.AuthorizationConfig

/**
 * @deprecated Legacy connector template response. Use `IntegrationTemplate`.
 */
export type ConnectorTemplateResponse = legacy.ConnectorTemplateResponse

/**
 * @deprecated Legacy integration create input. Use `TemplateConfigCreateInput`; fields differ.
 */
export type CreateIntegrationOptions = legacy.CreateIntegrationOptions

/**
 * @deprecated Legacy integration delete input. Pass the config UUID to `integrationAdmin.delete`.
 */
export type DeleteIntegrationOptions = legacy.DeleteIntegrationOptions

/**
 * @deprecated Legacy integration template read input. Pass the template UUID to
 * `integrationTemplates.get`.
 */
export type GetIntegrationTemplateOptions = legacy.GetIntegrationTemplateOptions

/**
 * @deprecated Legacy template list input. Use `PageOptions` with `integrationTemplates.list`.
 */
export type ListIntegrationTemplatesOptions = legacy.ListIntegrationTemplatesOptions

/**
 * @deprecated Legacy template field. Use `IntegrationFieldSchema`; the native union is richer.
 */
export type TemplateField = legacy.TemplateField

/**
 * @deprecated Legacy test response. Use `ConnectionTestResult`.
 */
export type TestConnectionResponse = legacy.TestConnectionResponse

/**
 * @deprecated Legacy stored-config test input. Pass the config UUID to `integrationAdmin.testConfig`.
 */
export type TestIntegrationByIdOptions = legacy.TestIntegrationByIdOptions

/**
 * @deprecated Legacy credential test input. Use `TestCredentialsInput`; payload fields differ.
 */
export type TestIntegrationOptions = legacy.TestIntegrationOptions

/**
 * @deprecated Legacy integration update input. Use `TemplateConfigUpdateInput`; omitted values
 * preserve stored credentials.
 */
export type UpdateIntegrationOptions = legacy.UpdateIntegrationOptions

// Builder: agents

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.agents.create` instead. It accepts native Function UUIDs and returns `AgentDefinition`.
 */
export const createAgentMitra = legacy.createAgentMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.agents.get` instead. The native response does not use the legacy BFF envelope.
 */
export const readAgentMitra = legacy.readAgentMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.agents.list` instead. It returns a native page.
 */
export const listAgentsMitra = legacy.listAgentsMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.agents.update` instead. Its input is a complete native replacement, including the
 * complete Function ID list.
 */
export const updateAgentMitra = legacy.updateAgentMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.agents.delete` instead. It returns no legacy response envelope.
 */
export const deleteAgentMitra = legacy.deleteAgentMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use the explicit `mitra.agentTasks.create` or `get` method. The legacy action multiplexer and
 * session transport are not preserved by the native HTTP API.
 */
export const getAgentTaskMitra = legacy.getAgentTaskMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use the explicit `mitra.agentTasks.list`, `rename`, `archive`, `sendInput`, or `listMessages`
 * method. Live session streaming is not part of these HTTP methods.
 */
export const manageAgentChatMitra = legacy.manageAgentChatMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use the explicit methods on `mitra.agentCredentials`. OAuth and device authorization are
 * separate native calls rather than one action multiplexer.
 */
export const manageAgentCredentialMitra = legacy.manageAgentCredentialMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use the explicit methods on `mitra.agentConnections`. The native API returns provider status
 * metadata and keeps credential values write-only.
 */
export const manageAgentConnectionMitra = legacy.manageAgentConnectionMitra

/**
 * @deprecated Legacy business Agent. Use `AgentDefinition`; Function link field names differ.
 */
export type Agent = legacy.Agent

/**
 * @deprecated Legacy Copilot task/chat summary. Use `AgentTask` from `mitra.agentTasks.list` or
 * `get`; the native DTO uses `title` instead of `name` and includes ownership metadata.
 */
export type AgentChat = legacy.AgentChat

/**
 * @deprecated Legacy Agent connection preserved under its original name. Use
 * `CoreAgentConnection` with `mitra.agentConnections`; credential metadata differs.
 */
export type AgentConnection = legacy.AgentConnection

/**
 * @deprecated Legacy provider credential status. Use `CredentialStatus` from
 * `mitra.agentCredentials.list`; native provider values use `CopilotProvider` casing.
 */
export type AgentCredentialStatus = legacy.AgentCredentialStatus

/**
 * @deprecated Use the `delta` payload from `CoreAgentTaskSessionEventMap` through
 * `mitra.agentTasks.session()`.
 */
export type AgentDeltaEvent = legacy.AgentDeltaEvent

/**
 * @deprecated Use the `error` payload from `CoreAgentTaskSessionEventMap`.
 */
export type AgentErrorEvent = legacy.AgentErrorEvent

/**
 * @deprecated Legacy live-session message preserved under its original name. Use
 * `CoreAgentMessage` for persisted messages from `mitra.agentTasks.listMessages`.
 */
export type AgentMessage = legacy.AgentMessage

/**
 * @deprecated Legacy credential model preserved under its original name. Use `CoreAgentModel` for
 * models returned by `mitra.agentCredentials.listModels` or `mitra.agents.listModels`.
 */
export type AgentModel = legacy.AgentModel

/**
 * @deprecated Legacy lowercase provider name. Use `CopilotProvider`; native values are uppercase
 * and may include providers added by the service.
 */
export type AgentProvider = legacy.AgentProvider

/**
 * @deprecated Use the `queueChange` payload from `CoreAgentTaskSessionEventMap`.
 */
export type AgentQueueChangeEvent = legacy.AgentQueueChangeEvent

/**
 * @deprecated Use `AgentTaskEvent` from the native session `raw` event.
 */
export type AgentRawEvent = legacy.AgentRawEvent

/**
 * @deprecated Use the `statusChange` payload from `CoreAgentTaskSessionEventMap`.
 */
export type AgentStatusChangeEvent = legacy.AgentStatusChangeEvent

/**
 * @deprecated Use the `taskCreated` payload from `CoreAgentTaskSessionEventMap`.
 */
export type AgentTaskCreatedEvent = legacy.AgentTaskCreatedEvent

/**
 * @deprecated Use `CoreAgentTaskSessionEventMap`.
 */
export type AgentTaskEventMap = legacy.AgentTaskEventMap

/**
 * @deprecated Use `keyof CoreAgentTaskSessionEventMap`.
 */
export type AgentTaskEventName = legacy.AgentTaskEventName

/**
 * @deprecated Use `CoreAgentTaskSession` from `mitra.agentTasks.session()`.
 */
export type AgentTaskSession = legacy.AgentTaskSession

/**
 * @deprecated Use `CoreAgentTaskSessionStatus`.
 */
export type AgentTaskStatus = legacy.AgentTaskStatus

/**
 * @deprecated Use `AgentSessionTransport`. The Functions adapter supports `auto` and `http`.
 */
export type AgentTaskTransport = legacy.AgentTaskTransport

/**
 * @deprecated Use `CoreAgentTimelineItem`.
 */
export type AgentTimelineItem = legacy.AgentTimelineItem

/**
 * @deprecated Use `CoreAgentToolEvent`.
 */
export type AgentToolEvent = legacy.AgentToolEvent

/**
 * @deprecated Use `AgentTurnResult` from `sendAndWait()`.
 */
export type AgentTurnEndEvent = legacy.AgentTurnEndEvent

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentType = legacy.AgentType

/**
 * @deprecated Legacy provider OAuth-start response. Use `OAuthStartResult` from
 * `agentCredentials.startOAuth` or `agentConnections.startOAuth`.
 */
export type AuthAgentCredentialResult = legacy.AuthAgentCredentialResult

/**
 * @deprecated Legacy chat action union. Use explicit `agentTasks.list`, `rename`, and `archive`
 * methods instead of an action discriminator.
 */
export type ChatManageAction = legacy.ChatManageAction

/**
 * @deprecated Legacy OAuth or device-flow completion response. Use `AuthenticationResult`.
 */
export type ConnectAgentCredentialResult = legacy.ConnectAgentCredentialResult

/**
 * @deprecated Legacy Agent create input. Use `AgentInput`; `serverFunctionIds` becomes `functionIds`.
 */
export type CreateAgentOptions = legacy.CreateAgentOptions

/**
 * @deprecated Legacy Agent create response. Use `AgentDefinition`.
 */
export type CreateAgentResponse = legacy.CreateAgentResponse

/**
 * @deprecated Legacy credential action union. Use the explicit methods on
 * `mitra.agentCredentials` instead.
 */
export type CredentialAction = legacy.CredentialAction

/**
 * @deprecated Legacy chat archive response. `agentTasks.archive(taskId)` performs the same native
 * operation and resolves without a response body.
 */
export type DeleteAgentChatResult = legacy.DeleteAgentChatResult

/**
 * @deprecated Legacy Agent delete input. Pass the Agent UUID directly to `mitra.agents.delete`;
 * native app scope comes from the runtime token and client configuration.
 */
export type DeleteAgentOptions = legacy.DeleteAgentOptions

/**
 * @deprecated Legacy Agent delete response. The native delete has no response body.
 */
export type DeleteAgentResponse = legacy.DeleteAgentResponse

/**
 * @deprecated Legacy device authorization response. Use `DeviceAuthorization`.
 */
export type DeviceAuthAgentCredentialResult = legacy.DeviceAuthAgentCredentialResult

/**
 * @deprecated Legacy task-create input. Use `AgentTaskCreateInput`.
 */
export type GetAgentTaskCreateOptions = legacy.GetAgentTaskCreateOptions

/**
 * @deprecated Legacy task-open input. Pass the task UUID to `agentTasks.get`.
 */
export type GetAgentTaskOpenOptions = legacy.GetAgentTaskOpenOptions

/**
 * @deprecated Legacy create/open action union. Use explicit `agentTasks.create` or `get` methods.
 */
export type GetAgentTaskOptions = legacy.GetAgentTaskOptions

/**
 * @deprecated Legacy connection-list envelope. Use `CoreAgentConnection[]`.
 */
export type ListAgentConnectionsResult = legacy.ListAgentConnectionsResult

/**
 * @deprecated Legacy model-list envelope. Use `CoreAgentModel[]`.
 */
export type ListAgentModelsResult = legacy.ListAgentModelsResult

/**
 * @deprecated Legacy provider-status envelope. Use `CredentialStatus[]` returned directly by
 * `mitra.agentCredentials.list`.
 */
export type ListAgentProvidersResult = legacy.ListAgentProvidersResult

/**
 * @deprecated Legacy Agent list input. Use `PageOptions` with `mitra.agents.list`; native app scope
 * comes from the runtime token and client configuration.
 */
export type ListAgentsOptions = legacy.ListAgentsOptions

/**
 * @deprecated Legacy Agent list response. Use `Page<AgentDefinition>`.
 */
export type ListAgentsResponse = legacy.ListAgentsResponse

/**
 * @deprecated Legacy chat archive action input. Pass `taskId` to `mitra.agentTasks.archive`;
 * native app scope is implicit and the method has no action discriminator.
 */
export type ManageAgentChatDeleteOptions = legacy.ManageAgentChatDeleteOptions

/**
 * @deprecated Legacy chat list action input. Use `AgentTaskListOptions` with
 * `mitra.agentTasks.list`; native pagination returns `Page<AgentTask>`.
 */
export type ManageAgentChatListOptions = legacy.ManageAgentChatListOptions

/**
 * @deprecated Legacy chat action union. Use explicit `mitra.agentTasks.list`, `rename`, or
 * `archive` calls; their inputs and return types are operation-specific.
 */
export type ManageAgentChatOptions = legacy.ManageAgentChatOptions

/**
 * @deprecated Legacy chat rename action input. Call `mitra.agentTasks.rename(taskId, title)`;
 * native app scope is implicit and `title` replaces `name`.
 */
export type ManageAgentChatRenameOptions = legacy.ManageAgentChatRenameOptions

/**
 * @deprecated Legacy connection action union. Use explicit methods on `mitra.agentConnections`,
 * including `list`, `create`, `delete`, `saveApiKey`, OAuth, and device authorization methods.
 */
export type ManageAgentConnectionOptions = legacy.ManageAgentConnectionOptions

/**
 * @deprecated Legacy credential action union. Use explicit methods on `agentCredentials`.
 */
export type ManageAgentCredentialOptions = legacy.ManageAgentCredentialOptions

/**
 * @deprecated Legacy client-side queued prompt. Native `agentTasks.sendInput` sends immediately
 * through the HTTP channel and does not expose this queue item.
 */
export type QueuedItem = legacy.QueuedItem

/**
 * @deprecated Legacy Agent read input. Pass the Agent UUID directly to `mitra.agents.get`; native
 * app scope comes from the runtime token and client configuration.
 */
export type ReadAgentOptions = legacy.ReadAgentOptions

/**
 * @deprecated Legacy Agent read response. Use `AgentDefinition`.
 */
export type ReadAgentResponse = legacy.ReadAgentResponse

/**
 * @deprecated Legacy chat rename response `{ taskId, name }`. Use the `AgentTask` returned by
 * `mitra.agentTasks.rename`, whose field is named `title`.
 */
export type RenameAgentChatResult = legacy.RenameAgentChatResult

/**
 * @deprecated Legacy live-session send options. Use an `AgentTaskInput` message with
 * `mitra.agentTasks.sendInput`; the native input carries content, model, and reasoning options.
 */
export type SendOptions = legacy.SendOptions

/**
 * @deprecated Legacy Agent update input. Use `AgentInput`; the native method is a complete
 * replacement and uses `functionIds`.
 */
export type UpdateAgentOptions = legacy.UpdateAgentOptions

/**
 * @deprecated Legacy Agent update response. Use `AgentDefinition`.
 */
export type UpdateAgentResponse = legacy.UpdateAgentResponse

// Builder: users

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.members.invite` instead. The native method receives the app UUID explicitly and
 * returns no legacy BFF envelope. The default runtime token has MEMBER_WRITE but not MEMBER_READ.
 */
export const inviteUserMitra = legacy.inviteUserMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.members.unsubscribe` instead. It receives native app and user UUIDs and returns no
 * legacy BFF envelope.
 */
export const unsubscribeUserMitra = legacy.unsubscribeUserMitra

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type InviteUserOptions = legacy.InviteUserOptions

/**
 * @deprecated Legacy invite response. `members.invite` has no response body.
 */
export type InviteUserResult = legacy.InviteUserResult

/**
 * @deprecated Legacy unsubscribe input. Pass native app and user UUIDs to `members.unsubscribe`.
 */
export type UnsubscribeUserOptions = legacy.UnsubscribeUserOptions

/**
 * @deprecated Legacy unsubscribe response. `members.unsubscribe` has no response body.
 */
export type UnsubscribeUserResult = legacy.UnsubscribeUserResult

// Builder: deploy

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no one-call native replacement for the legacy archive upload. Convert the package to a
 * text file map, call `mitra.currentApp.replaceFiles` or `mergeFiles`, then call `build` for a
 * preview build or `publish` for a published build.
 */
export const deployToS3Mitra = legacy.deployToS3Mitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * Use `mitra.currentApp.getDeploy` instead. It polls by stable deploy UUID and returns `AppDeploy`.
 */
export const getDeployStatusMitra = legacy.getDeployStatusMitra

/**
 * @deprecated Legacy direct-S3 archive input. Native deployment accepts a text file map through
 * `currentApp.replaceFiles` or `mergeFiles`, followed by `build` or `publish`.
 */
export type DeployToS3Options = legacy.DeployToS3Options

/**
 * @deprecated Legacy direct-S3 deploy response. Use `AppDefinition` from publish or `AppDeploy`
 * from preview build.
 */
export type DeployToS3Response = legacy.DeployToS3Response

/**
 * @deprecated Legacy deploy-status input. Pass app and deploy UUIDs to `apps.getDeploy`, or only
 * the deploy UUID to `currentApp.getDeploy`.
 */
export type GetDeployStatusOptions = legacy.GetDeployStatusOptions

/**
 * @deprecated Legacy deploy-status response. Use `AppDeploy`.
 */
export type GetDeployStatusResponse = legacy.GetDeployStatusResponse
