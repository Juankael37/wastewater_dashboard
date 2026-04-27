/**
 * Backend capability detection — determines which API features the current
 * backend supports (Worker vs Flask vs unknown).
 */

import { API_BASE_URL } from './client';
import type { BackendCapabilities } from './types';

const strictUnknownCapabilities = (): BackendCapabilities => ({
  mode: 'unknown',
  supportsLegacyAdminApi: false,
  supportsLegacyParameterWriteApi: false,
  supportsLegacyDataCountApi: false,
  supportsLegacyDataClearApi: false,
  supportsLegacyDataImportApi: false,
  supportsLegacyDataExportApi: false,
  supportsLegacyUserListApi: true,
  supportsLegacyUserCreateApi: true,
  supportsLegacyUserDeleteApi: true,
  supportsLegacyReportsApi: false,
  supportsLegacyReportMetricsApi: false,
  supportsLegacyReportPdfApi: false,
  supportsLegacyValidationApi: false,
});

const fallbackBackendCapabilities = (): BackendCapabilities => {
  const base = API_BASE_URL.toLowerCase();
  if (base.includes('localhost:5000') || base.includes('127.0.0.1:5000')) {
    return {
      mode: 'flask',
      supportsLegacyAdminApi: true,
      supportsLegacyParameterWriteApi: true,
      supportsLegacyDataCountApi: true,
      supportsLegacyDataClearApi: true,
      supportsLegacyDataImportApi: true,
      supportsLegacyDataExportApi: true,
      supportsLegacyUserListApi: true,
      supportsLegacyUserCreateApi: true,
      supportsLegacyUserDeleteApi: true,
      supportsLegacyReportsApi: true,
      supportsLegacyReportMetricsApi: true,
      supportsLegacyReportPdfApi: true,
      supportsLegacyValidationApi: true,
    };
  }
  return strictUnknownCapabilities();
};

let cachedCapabilities: BackendCapabilities | null = null;

export async function getBackendCapabilities(): Promise<BackendCapabilities> {
  if (cachedCapabilities) return cachedCapabilities;

  try {
    const endpointCandidates = ['/capabilities', '/api/capabilities', '/'];
    for (const endpoint of endpointCandidates) {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, { method: 'GET' });
      if (!response.ok) continue;

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) continue;

      const payload = await response.json();

      // Preferred explicit capabilities shape.
      if (payload?.mode && typeof payload?.supportsLegacyAdminApi === 'boolean') {
        cachedCapabilities = payload as BackendCapabilities;
        return cachedCapabilities;
      }

      // Worker health payload includes capabilities in root.
      if (payload?.capabilities?.mode && typeof payload?.capabilities?.supportsLegacyAdminApi === 'boolean') {
        cachedCapabilities = payload.capabilities as BackendCapabilities;
        return cachedCapabilities;
      }

      // Backward-compat Worker detection if capabilities are absent.
      if (payload?.message === 'Wastewater Monitoring API' && payload?.version) {
        cachedCapabilities = strictUnknownCapabilities();
        return cachedCapabilities;
      }
    }
  } catch {
    // Fall through to URL-based fallback.
  }

  cachedCapabilities = fallbackBackendCapabilities();
  return cachedCapabilities;
}
