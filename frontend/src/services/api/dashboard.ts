/**
 * Dashboard API — snapshot aggregation and trend data for the dashboard view.
 */

import { apiRequest } from './client';
import { getBackendCapabilities } from './capabilities';
import { measurementsApi } from './measurements';
import { alertsApi } from './alerts';
import type {
  DashboardData,
  DashboardSnapshotDTO,
  ParameterStatusDTO,
  ChartSeriesDTO,
} from './types';

/** Parameter config — labels, units, limits, and chart colors. */
const PARAM_CONFIG: Record<string, { label: string; unit: string; min: number; max: number; color: string }> = {
  ph: { label: 'pH', unit: '', min: 6.0, max: 9.5, color: '#3b82f6' },
  cod: { label: 'COD', unit: 'mg/L', min: 0, max: 100, color: '#ef4444' },
  bod: { label: 'BOD', unit: 'mg/L', min: 0, max: 50, color: '#f97316' },
  tss: { label: 'TSS', unit: 'mg/L', min: 0, max: 100, color: '#8b5cf6' },
  ammonia: { label: 'Ammonia', unit: 'mg/L', min: 0, max: 0.5, color: '#06b6d4' },
  nitrate: { label: 'Nitrate', unit: 'mg/L', min: 0, max: 14, color: '#10b981' },
  phosphate: { label: 'Phosphate', unit: 'mg/L', min: 0, max: 1, color: '#84cc16' },
  temperature: { label: 'Temperature', unit: '°C', min: 10, max: 40, color: '#f43f5e' },
  flow: { label: 'Flow', unit: 'm³/h', min: 0, max: 5000, color: '#6366f1' },
};

const PARAM_KEYS = Object.keys(PARAM_CONFIG);

export const dashboardApi = {
  getData: async (): Promise<DashboardData> => {
    const response = await apiRequest<{ data: any[] }>('/measurements?limit=500');
    const measurements = response.data || [];

    const groupedByDate: Record<string, Record<string, number>> = {};

    for (const m of measurements) {
      const key = String(m.parameters?.name || '').toLowerCase();
      if (!PARAM_KEYS.includes(key)) continue;
      const date = new Date(m.timestamp).toISOString().slice(0, 10);
      groupedByDate[date] ||= {};
      if (m.type === 'effluent' || groupedByDate[date][key] === undefined) {
        groupedByDate[date][key] = Number(m.value);
      }
    }

    const dates = Object.keys(groupedByDate).sort();
    const buildSeries = (param: string) => dates.map((d) => groupedByDate[d][param] ?? 0);

    return {
      dates,
      data: {
        ph: buildSeries('ph'),
        cod: buildSeries('cod'),
        bod: buildSeries('bod'),
        tss: buildSeries('tss'),
        ammonia: buildSeries('ammonia'),
        nitrate: buildSeries('nitrate'),
        phosphate: buildSeries('phosphate'),
        temperature: buildSeries('temperature'),
        flow: buildSeries('flow'),
      },
      standards: {
        ph: { min: 6.0, max: 9.5 },
        cod: { max: 100 },
        bod: { max: 50 },
        tss: { max: 100 },
        ammonia: { max: 0.5 },
        nitrate: { max: 14 },
        phosphate: { max: 1 },
        temperature: { min: 10, max: 40 },
        flow: { max: 5000 },
      },
    };
  },

  getSnapshot: async (): Promise<DashboardSnapshotDTO> => {
    const [measurements, alerts] = await Promise.all([
      measurementsApi.getRecent(300, true),
      alertsApi.getAll(),
    ]);

    // --- Compliance tracking ---
    let compliantCount = 0;
    let totalCount = 0;

    for (const m of measurements) {
      const key = String(m.parameter_key || '').toLowerCase();
      if (!PARAM_CONFIG[key]) continue;
      totalCount += 1;
      if (m.value >= PARAM_CONFIG[key].min && m.value <= PARAM_CONFIG[key].max) {
        compliantCount += 1;
      }
    }

    // --- Parameter status cards ---
    const parameterStatuses: ParameterStatusDTO[] = PARAM_KEYS.map((key) => {
      const latestInfluent = [...measurements]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .find((m) => String(m.parameter_key || '').toLowerCase() === key && m.type === 'influent');

      const latestEffluent = [...measurements]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .find((m) => String(m.parameter_key || '').toLowerCase() === key && (!m.type || m.type === 'effluent'));

      const influentValue = Number(latestInfluent?.value || 0);
      const effluentValue = Number(latestEffluent?.value || 0);
      const cfg = PARAM_CONFIG[key];
      const margin = (cfg.max - cfg.min) * 0.1;

      let status: 'good' | 'warning' | 'critical' = 'good';
      if (effluentValue < cfg.min || effluentValue > cfg.max) status = 'critical';
      else if (effluentValue < cfg.min + margin || effluentValue > cfg.max - margin) status = 'warning';

      return {
        key,
        name: cfg.label,
        influentValue,
        effluentValue,
        unit: cfg.unit,
        status,
        standard: `${cfg.min}-${cfg.max}`,
        color: cfg.color,
      };
    });

    // --- Chart series ---
    const chartSeries: Record<string, ChartSeriesDTO> = {};
    PARAM_KEYS.forEach((key) => {
      const rows = measurements
        .filter((m) => String(m.parameter_key || '').toLowerCase() === key)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      const byTimestamp = new Map<string, { influent?: number; effluent?: number }>();
      rows.forEach((m) => {
        const ts = m.timestamp;
        const current = byTimestamp.get(ts) || {};
        current[m.type] = Number(m.value);
        byTimestamp.set(ts, current);
      });

      const timestampKeys = Array.from(byTimestamp.keys()).slice(-10);
      chartSeries[key] = {
        labels: timestampKeys.map((ts) =>
          new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        ),
        influent: timestampKeys.map((ts) => byTimestamp.get(ts)?.influent ?? 0),
        effluent: timestampKeys.map(
          (ts) => byTimestamp.get(ts)?.effluent ?? byTimestamp.get(ts)?.influent ?? 0,
        ),
      };
    });

    const latestMeasurementTimestamp =
      measurements.length > 0
        ? measurements
            .map((m) => m.timestamp)
            .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
        : null;

    return {
      parameterStatuses,
      chartSeries,
      recentAlerts: alerts.slice(0, 5),
      complianceRate: totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 100,
      totalReadings: measurements.length,
      latestMeasurementTimestamp,
    };
  },

  getSummary: async (): Promise<any> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyReportMetricsApi) {
      throw new Error('Report summary endpoint is not available on Worker API yet.');
    }
    return apiRequest('/api/reports/summary');
  },

  getPerformance: async (): Promise<any> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyReportMetricsApi) {
      throw new Error('Performance report endpoint is not available on Worker API yet.');
    }
    return apiRequest('/api/reports/performance');
  },
};
