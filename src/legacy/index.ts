/**
 * Backward compatible surface of the legacy `mitra-sdk` package.
 *
 * Every export here is the legacy binding itself, re-exported unchanged and marked
 * `@deprecated` so existing Server Function code keeps working while the new
 * `@mitralab.io` family grows. Nothing in this module wraps, adapts, or renames a
 * legacy API.
 *
 * The legacy SDK talks to the platform through the BFF gateway, whose routes live
 * under `/agentAiShortcut` and `/interactions`, while this package derives `/iam`,
 * `/functions`, and the other service prefixes from the same base URL. Both work
 * against the same gateway, so `MITRA_API_URL` is handed to the legacy SDK exactly
 * as configured, with no URL transformation.
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
 * Unauthenticated public execution is not part of the runtime SDK. There is no replacement yet;
 * this API is still supported.
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
 * The runtime integration module only executes integrations. There is no replacement yet; this API
 * is still supported.
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
 * There is no replacement yet; this API is still supported.
 */
export const getProjectsMitra = legacy.getProjectsMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const getProjectContextMitra = legacy.getProjectContextMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const listProjectsMitra = legacy.listProjectsMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const createProjectMitra = legacy.createProjectMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const updateProjectSettingsMitra = legacy.updateProjectSettingsMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const getGitConfigMitra = legacy.getGitConfigMitra

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type CreateProjectOptions = legacy.CreateProjectOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type CreateProjectResponse = legacy.CreateProjectResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type GetProjectContextOptions = legacy.GetProjectContextOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type GetProjectContextResponse = legacy.GetProjectContextResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type GetProjectsResponse = legacy.GetProjectsResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ListProjectsOptions = legacy.ListProjectsOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ListProjectsResponse = legacy.ListProjectsResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type UpdateProjectSettingsOptions = legacy.UpdateProjectSettingsOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type UpdateProjectSettingsResponse = legacy.UpdateProjectSettingsResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type GetGitConfigOptions = legacy.GetGitConfigOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type GetGitConfigResponse = legacy.GetGitConfigResponse

// Builder: JDBC connections

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const createJdbcConnectionMitra = legacy.createJdbcConnectionMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const listJdbcConnectionsMitra = legacy.listJdbcConnectionsMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const updateJdbcConnectionMitra = legacy.updateJdbcConnectionMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const deleteJdbcConnectionMitra = legacy.deleteJdbcConnectionMitra

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type CreateJdbcConnectionOptions = legacy.CreateJdbcConnectionOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type CreateJdbcConnectionResponse = legacy.CreateJdbcConnectionResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type DeleteJdbcConnectionOptions = legacy.DeleteJdbcConnectionOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type DeleteJdbcConnectionResponse = legacy.DeleteJdbcConnectionResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ListJdbcConnectionsOptions = legacy.ListJdbcConnectionsOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ListJdbcConnectionsResponse = legacy.ListJdbcConnectionsResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type UpdateJdbcConnectionOptions = legacy.UpdateJdbcConnectionOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type UpdateJdbcConnectionResponse = legacy.UpdateJdbcConnectionResponse

// Builder: raw SQL

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * These run raw SQL against a project data source, which `mitra.queries.execute`
 * does not do: it runs a saved query by id.
 * There is no replacement yet; this API is still supported.
 */
export const runQueryMitra = legacy.runQueryMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * These run raw SQL against a project data source, which `mitra.queries.execute`
 * does not do: it runs a saved query by id.
 * There is no replacement yet; this API is still supported.
 */
export const runDdlMitra = legacy.runDdlMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * These run raw SQL against a project data source, which `mitra.queries.execute`
 * does not do: it runs a saved query by id.
 * There is no replacement yet; this API is still supported.
 */
export const runDmlMitra = legacy.runDmlMitra

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type RunQueryOptions = legacy.RunQueryOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type RunQueryResponse = legacy.RunQueryResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type RunDdlOptions = legacy.RunDdlOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type RunDdlResponse = legacy.RunDdlResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type RunDmlOptions = legacy.RunDmlOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type RunDmlResponse = legacy.RunDmlResponse

// Builder: tables

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const listTablesMitra = legacy.listTablesMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const createOnlineTableMitra = legacy.createOnlineTableMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const listOnlineTablesMitra = legacy.listOnlineTablesMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const updateOnlineTableMitra = legacy.updateOnlineTableMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const deleteOnlineTableMitra = legacy.deleteOnlineTableMitra

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ListTablesOptions = legacy.ListTablesOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ListTablesResponse = legacy.ListTablesResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type CreateOnlineTableOptions = legacy.CreateOnlineTableOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type CreateOnlineTableResponse = legacy.CreateOnlineTableResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type DeleteOnlineTableOptions = legacy.DeleteOnlineTableOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type DeleteOnlineTableResponse = legacy.DeleteOnlineTableResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ListOnlineTablesOptions = legacy.ListOnlineTablesOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ListOnlineTablesResponse = legacy.ListOnlineTablesResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type UpdateOnlineTableOptions = legacy.UpdateOnlineTableOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type UpdateOnlineTableResponse = legacy.UpdateOnlineTableResponse

// Builder: Server Function CRUD

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const createServerFunctionMitra = legacy.createServerFunctionMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const readServerFunctionMitra = legacy.readServerFunctionMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const listServerFunctionsMitra = legacy.listServerFunctionsMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const updateServerFunctionMitra = legacy.updateServerFunctionMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const deleteServerFunctionMitra = legacy.deleteServerFunctionMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const togglePublicExecutionMitra = legacy.togglePublicExecutionMitra

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type CreateServerFunctionOptions = legacy.CreateServerFunctionOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type CreateServerFunctionResponse = legacy.CreateServerFunctionResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type DeleteServerFunctionOptions = legacy.DeleteServerFunctionOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type DeleteServerFunctionResponse = legacy.DeleteServerFunctionResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ListServerFunctionsOptions = legacy.ListServerFunctionsOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ListServerFunctionsResponse = legacy.ListServerFunctionsResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ReadServerFunctionOptions = legacy.ReadServerFunctionOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ReadServerFunctionResponse = legacy.ReadServerFunctionResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type UpdateServerFunctionOptions = legacy.UpdateServerFunctionOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type UpdateServerFunctionResponse = legacy.UpdateServerFunctionResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type TogglePublicExecutionOptions = legacy.TogglePublicExecutionOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type TogglePublicExecutionResponse = legacy.TogglePublicExecutionResponse

// Builder: integration configuration

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const createIntegrationMitra = legacy.createIntegrationMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const updateIntegrationMitra = legacy.updateIntegrationMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const deleteIntegrationMitra = legacy.deleteIntegrationMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const testIntegrationMitra = legacy.testIntegrationMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const testIntegrationByIdMitra = legacy.testIntegrationByIdMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const listIntegrationTemplatesMitra = legacy.listIntegrationTemplatesMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const getIntegrationTemplateMitra = legacy.getIntegrationTemplateMitra

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AuthorizationConfig = legacy.AuthorizationConfig

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ConnectorTemplateResponse = legacy.ConnectorTemplateResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type CreateIntegrationOptions = legacy.CreateIntegrationOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type DeleteIntegrationOptions = legacy.DeleteIntegrationOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type GetIntegrationTemplateOptions = legacy.GetIntegrationTemplateOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ListIntegrationTemplatesOptions = legacy.ListIntegrationTemplatesOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type TemplateField = legacy.TemplateField

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type TestConnectionResponse = legacy.TestConnectionResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type TestIntegrationByIdOptions = legacy.TestIntegrationByIdOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type TestIntegrationOptions = legacy.TestIntegrationOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type UpdateIntegrationOptions = legacy.UpdateIntegrationOptions

// Builder: agents

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * The Agent SDK has not been ported to the new family.
 * There is no replacement yet; this API is still supported.
 */
export const createAgentMitra = legacy.createAgentMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * The Agent SDK has not been ported to the new family.
 * There is no replacement yet; this API is still supported.
 */
export const readAgentMitra = legacy.readAgentMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * The Agent SDK has not been ported to the new family.
 * There is no replacement yet; this API is still supported.
 */
export const listAgentsMitra = legacy.listAgentsMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * The Agent SDK has not been ported to the new family.
 * There is no replacement yet; this API is still supported.
 */
export const updateAgentMitra = legacy.updateAgentMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * The Agent SDK has not been ported to the new family.
 * There is no replacement yet; this API is still supported.
 */
export const deleteAgentMitra = legacy.deleteAgentMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * The Agent SDK has not been ported to the new family.
 * There is no replacement yet; this API is still supported.
 */
export const getAgentTaskMitra = legacy.getAgentTaskMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * The Agent SDK has not been ported to the new family.
 * There is no replacement yet; this API is still supported.
 */
export const manageAgentChatMitra = legacy.manageAgentChatMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * The Agent SDK has not been ported to the new family.
 * There is no replacement yet; this API is still supported.
 */
export const manageAgentCredentialMitra = legacy.manageAgentCredentialMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * The Agent SDK has not been ported to the new family.
 * There is no replacement yet; this API is still supported.
 */
export const manageAgentConnectionMitra = legacy.manageAgentConnectionMitra

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type Agent = legacy.Agent

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentChat = legacy.AgentChat

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentConnection = legacy.AgentConnection

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentCredentialStatus = legacy.AgentCredentialStatus

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentDeltaEvent = legacy.AgentDeltaEvent

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentErrorEvent = legacy.AgentErrorEvent

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentMessage = legacy.AgentMessage

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentModel = legacy.AgentModel

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentProvider = legacy.AgentProvider

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentQueueChangeEvent = legacy.AgentQueueChangeEvent

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentRawEvent = legacy.AgentRawEvent

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentStatusChangeEvent = legacy.AgentStatusChangeEvent

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentTaskCreatedEvent = legacy.AgentTaskCreatedEvent

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentTaskEventMap = legacy.AgentTaskEventMap

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentTaskEventName = legacy.AgentTaskEventName

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentTaskSession = legacy.AgentTaskSession

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentTaskStatus = legacy.AgentTaskStatus

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentTaskTransport = legacy.AgentTaskTransport

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentTimelineItem = legacy.AgentTimelineItem

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentToolEvent = legacy.AgentToolEvent

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentTurnEndEvent = legacy.AgentTurnEndEvent

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AgentType = legacy.AgentType

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type AuthAgentCredentialResult = legacy.AuthAgentCredentialResult

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ChatManageAction = legacy.ChatManageAction

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ConnectAgentCredentialResult = legacy.ConnectAgentCredentialResult

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type CreateAgentOptions = legacy.CreateAgentOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type CreateAgentResponse = legacy.CreateAgentResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type CredentialAction = legacy.CredentialAction

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type DeleteAgentChatResult = legacy.DeleteAgentChatResult

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type DeleteAgentOptions = legacy.DeleteAgentOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type DeleteAgentResponse = legacy.DeleteAgentResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type DeviceAuthAgentCredentialResult = legacy.DeviceAuthAgentCredentialResult

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type GetAgentTaskCreateOptions = legacy.GetAgentTaskCreateOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type GetAgentTaskOpenOptions = legacy.GetAgentTaskOpenOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type GetAgentTaskOptions = legacy.GetAgentTaskOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ListAgentConnectionsResult = legacy.ListAgentConnectionsResult

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ListAgentModelsResult = legacy.ListAgentModelsResult

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ListAgentProvidersResult = legacy.ListAgentProvidersResult

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ListAgentsOptions = legacy.ListAgentsOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ListAgentsResponse = legacy.ListAgentsResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ManageAgentChatDeleteOptions = legacy.ManageAgentChatDeleteOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ManageAgentChatListOptions = legacy.ManageAgentChatListOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ManageAgentChatOptions = legacy.ManageAgentChatOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ManageAgentChatRenameOptions = legacy.ManageAgentChatRenameOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ManageAgentConnectionOptions = legacy.ManageAgentConnectionOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ManageAgentCredentialOptions = legacy.ManageAgentCredentialOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type QueuedItem = legacy.QueuedItem

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ReadAgentOptions = legacy.ReadAgentOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type ReadAgentResponse = legacy.ReadAgentResponse

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type RenameAgentChatResult = legacy.RenameAgentChatResult

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type SendOptions = legacy.SendOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type UpdateAgentOptions = legacy.UpdateAgentOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type UpdateAgentResponse = legacy.UpdateAgentResponse

// Builder: users

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const inviteUserMitra = legacy.inviteUserMitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const unsubscribeUserMitra = legacy.unsubscribeUserMitra

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type InviteUserOptions = legacy.InviteUserOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type InviteUserResult = legacy.InviteUserResult

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type UnsubscribeUserOptions = legacy.UnsubscribeUserOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type UnsubscribeUserResult = legacy.UnsubscribeUserResult

// Builder: deploy

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const deployToS3Mitra = legacy.deployToS3Mitra

/**
 * @deprecated Legacy `mitra-sdk` API kept for backward compatibility.
 * There is no replacement yet; this API is still supported.
 */
export const getDeployStatusMitra = legacy.getDeployStatusMitra

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type DeployToS3Options = legacy.DeployToS3Options

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type DeployToS3Response = legacy.DeployToS3Response

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type GetDeployStatusOptions = legacy.GetDeployStatusOptions

/**
 * @deprecated Legacy `mitra-sdk` type. There is no replacement yet; this API is still supported.
 */
export type GetDeployStatusResponse = legacy.GetDeployStatusResponse
