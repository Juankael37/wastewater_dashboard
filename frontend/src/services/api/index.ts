/**
 * API barrel — re-exports every public symbol so existing imports
 * (`from '../../services/api'`) continue to work unchanged.
 */

// Core
export { getConfiguredApiBaseUrl, formatTimeAgo } from './client';

// Capabilities
export { getBackendCapabilities } from './capabilities';

// Types
export type {
  BackendMode,
  BackendCapabilities,
  Measurement,
  Alert,
  Parameter,
  User,
  DashboardData,
  ParameterStatusDTO,
  ChartSeriesDTO,
  DashboardSnapshotDTO,
} from './types';

// Domain APIs
export { authApi } from './auth';
export { measurementsApi, plantsApi } from './measurements';
export { alertsApi } from './alerts';
export { dashboardApi } from './dashboard';
export {
  parametersApi,
  reportsApi,
  dataApi,
  dataManagementApi,
  usersApi,
  checkBackendHealth,
} from './management';
