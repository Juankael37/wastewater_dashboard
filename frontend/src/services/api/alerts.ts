/**
 * Alerts API — fetching, filtering, and resolving alerts.
 */

import { apiRequest, formatTimeAgo } from './client';
import { getBackendCapabilities } from './capabilities';
import type { Alert } from './types';

export const alertsApi = {
  getAll: async (): Promise<Alert[]> => {
    const response = await apiRequest<{ data: any[] }>('/alerts?resolved=false&limit=50');
    return (response.data || [])
      .filter((item) => {
        const measurement = item.measurements || {};
        return measurement.type !== 'influent';
      })
      .map((item) => {
        const measurement = item.measurements || {};
        const parameter =
          measurement.parameters?.display_name || measurement.parameters?.name || 'Unknown';
        const severity = item.severity || (item.resolved ? 'info' : 'warning');
        const message = `${parameter}: ${severity} (${measurement.value ?? '-'})`;
        return {
          id: item.id,
          parameter,
          value: measurement.value,
          status: severity,
          severity,
          message,
          plant: measurement.plants?.name || '',
          time: formatTimeAgo(item.created_at || measurement.timestamp),
          state: item.resolved ? 'resolved' : 'active',
          timestamp: item.created_at || measurement.timestamp,
          resolved_at: item.resolved_at || null,
        };
      });
  },

  getDashboard: async (): Promise<Alert[]> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyReportMetricsApi) {
      return alertsApi.getAll();
    }

    const payload = await apiRequest<any>('/api/alerts/dashboard');
    const rows = Array.isArray(payload) ? payload : (payload.alerts || []);
    return rows.map((item: any) => ({
      id: item.id,
      parameter: item.parameter || 'Unknown',
      value: item.value ?? 0,
      status: item.status || item.severity || 'warning',
      severity: item.severity || item.status || 'warning',
      message:
        item.message ||
        `${item.parameter || 'Parameter'}: ${item.status || item.severity || 'warning'} (${item.value ?? '-'})`,
      plant: item.plant || '',
      time: item.time || formatTimeAgo(item.timestamp),
      state: item.state || (item.resolved ? 'resolved' : 'active'),
      timestamp: item.timestamp,
      resolved_at: item.resolved_at || null,
    }));
  },

  resolve: async (alertId: number): Promise<void> => {
    await apiRequest(`/alerts/${alertId}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ resolved: true }),
    });
  },
};
