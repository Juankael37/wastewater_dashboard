/** Shared capability interface for Settings sub-sections. */
export interface SettingsCapabilities {
  supportsUserList: boolean
  supportsUserCreate: boolean
  supportsUserDelete: boolean
  supportsParameterWrite: boolean
  supportsDataCount: boolean
  supportsDataClear: boolean
}
