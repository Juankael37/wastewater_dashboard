/**
 * Shared TypeScript interfaces for the API layer.
 */

// ---------------------------------------------------------------------------
// Backend capability negotiation
// ---------------------------------------------------------------------------

export type BackendMode = 'worker' | 'flask' | 'unknown';

export interface BackendCapabilities {
  mode: BackendMode;
  supportsLegacyAdminApi: boolean;
  supportsLegacyParameterWriteApi?: boolean;
  supportsLegacyDataCountApi?: boolean;
  supportsLegacyDataClearApi?: boolean;
  supportsLegacyDataImportApi?: boolean;
  supportsLegacyDataExportApi?: boolean;
  supportsLegacyUserListApi?: boolean;
  supportsLegacyUserCreateApi?: boolean;
  supportsLegacyUserDeleteApi?: boolean;
  supportsLegacyReportsApi: boolean;
  supportsLegacyReportMetricsApi?: boolean;
  supportsLegacyReportPdfApi?: boolean;
  supportsLegacyValidationApi: boolean;
}

// ---------------------------------------------------------------------------
// Domain models
// ---------------------------------------------------------------------------

export interface Measurement {
  id: string;
  plant_id: string;
  parameter_id: string;
  parameter_key?: string;
  value: number;
  type: 'influent' | 'effluent';
  timestamp: string;
  operator_id: string;
  parameter_name?: string;
  plant_name?: string;
  unit?: string;
  [key: string]: any;
}

export interface Alert {
  id: string;
  parameter: string;
  value: number;
  status: string;
  severity?: 'critical' | 'warning' | 'info';
  message?: string;
  plant?: string;
  time?: string;
  state: string;
  timestamp: string;
  resolved_at: string | null;
}

export interface Parameter {
  id: string;
  parameter: string;
  min_limit: number;
  max_limit: number;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'operator' | 'client';
}

// ---------------------------------------------------------------------------
// Dashboard DTOs
// ---------------------------------------------------------------------------

export interface DashboardData {
  dates: string[];
  data: {
    ph: number[];
    cod: number[];
    bod: number[];
    tss: number[];
    ammonia: number[];
    nitrate: number[];
    phosphate: number[];
    temperature: number[];
    flow: number[];
  };
  standards: {
    ph: { min: number; max: number };
    cod: { max: number };
    bod: { max: number };
    tss: { max: number };
    ammonia: { max: number };
    nitrate: { max: number };
    phosphate: { max: number };
    temperature: { min: number; max: number };
    flow: { max: number };
  };
}

export interface ParameterStatusDTO {
  key: string;
  name: string;
  influentValue: number;
  effluentValue: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
  standard: string;
  color: string;
}

export interface ChartSeriesDTO {
  labels: string[];
  influent: number[];
  effluent: number[];
}

export interface DashboardSnapshotDTO {
  parameterStatuses: ParameterStatusDTO[];
  chartSeries: Record<string, ChartSeriesDTO>;
  recentAlerts: Alert[];
  complianceRate: number;
  totalReadings: number;
  latestMeasurementTimestamp?: string | null;
}
