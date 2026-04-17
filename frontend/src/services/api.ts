/**
 * API Service for Cloudflare Worker + Supabase-backed auth.
 */

const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  return 'http://localhost:8787';
};

const API_BASE_URL = getApiBaseUrl();
const ACCESS_TOKEN_KEY = 'ww_access_token';

type BackendMode = 'worker' | 'flask' | 'unknown';
interface BackendCapabilities {
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

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
const setAccessToken = (token: string) => localStorage.setItem(ACCESS_TOKEN_KEY, token);
const clearAccessToken = () => localStorage.removeItem(ACCESS_TOKEN_KEY);

const decodeJwtPayload = (token: string): any => {
  try {
    return JSON.parse(atob(token.split('.')[1] || 'e30='));
  } catch {
    return {};
  }
};

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
  if (base.includes('workers.dev') || base.includes('localhost:8787') || base.includes('127.0.0.1:8787')) {
    return {
      mode: 'worker',
      supportsLegacyAdminApi: false,
      supportsLegacyParameterWriteApi: true,
      supportsLegacyDataCountApi: true,
      supportsLegacyDataClearApi: true,
      supportsLegacyUserListApi: true,
      supportsLegacyUserCreateApi: true,
      supportsLegacyUserDeleteApi: false,
      supportsLegacyReportsApi: false,
      supportsLegacyReportMetricsApi: true,
      supportsLegacyReportPdfApi: true,
      supportsLegacyValidationApi: true,
    };
  }
  return {
    mode: 'unknown',
    supportsLegacyAdminApi: false,
    supportsLegacyDataCountApi: false,
    supportsLegacyDataClearApi: false,
    supportsLegacyUserListApi: false,
    supportsLegacyUserCreateApi: false,
    supportsLegacyUserDeleteApi: false,
    supportsLegacyReportsApi: false,
    supportsLegacyReportMetricsApi: false,
    supportsLegacyReportPdfApi: false,
    supportsLegacyValidationApi: false,
  };
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
        cachedCapabilities = {
          mode: 'worker',
          supportsLegacyAdminApi: false,
          supportsLegacyReportsApi: false,
          supportsLegacyReportPdfApi: true,
          supportsLegacyValidationApi: true,
          supportsLegacyParameterWriteApi: false,
          supportsLegacyDataImportApi: false,
          supportsLegacyDataExportApi: false,
        };
        return cachedCapabilities;
      }
    }
  } catch {
    // Fall through to URL-based fallback.
  }

  cachedCapabilities = fallbackBackendCapabilities();
  return cachedCapabilities;
}

// Types
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
  value: number;
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
  parameterStatusesInfluent: ParameterStatusDTO[];
  parameterStatusesEffluent: ParameterStatusDTO[];
  chartSeries: Record<string, ChartSeriesDTO>;
  recentAlerts: Alert[];
  complianceRate: number;
  totalReadings: number;
}

// Helper function for API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const isFormData = options.body instanceof FormData;
  const token = getAccessToken();

  const defaultOptions: RequestInit = {
    headers: isFormData
      ? {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers
        }
      : {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
  };

  try {
    const response = await fetch(url, { cache: 'no-store', ...defaultOptions, ...options });

    const contentType = response.headers.get('content-type');
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }

    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }

    return await response.text() as T;
  } catch (error) {
    console.error(`[API] Request failed for ${endpoint}:`, error);
    throw error;
  }
}

const formatTimeAgo = (timestamp?: string): string => {
  if (!timestamp) return 'Unknown';
  const now = new Date();
  const eventTime = new Date(timestamp);
  const diffMs = now.getTime() - eventTime.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return 'Just now';
};

// Authentication API
export const authApi = {
  login: async (email: string, password: string): Promise<{ user: any; session: any }> => {
    const result = await apiRequest<{ user: any; session: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (result?.session?.access_token) {
      setAccessToken(result.session.access_token);
    }

    return result;
  },
  
  logout: async (): Promise<void> => {
    clearAccessToken();
  },
  
  register: async (
    email: string,
    password: string,
    fullName?: string,
    role: 'admin' | 'operator' | 'client' = 'operator'
  ): Promise<{ user: any; session: any }> => {
    const result = await apiRequest<{ user: any; session: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        full_name: fullName || email.split('@')[0],
        role,
      }),
    });

    if (result?.session?.access_token) {
      setAccessToken(result.session.access_token);
    }

    return result;
  },
  
  checkAuth: async (): Promise<{ authenticated: boolean; user?: any }> => {
    const token = getAccessToken();
    if (!token) return { authenticated: false };

    try {
      const response = await authApi.getProfile();
      return { authenticated: true, user: response.user };
    } catch (error) {
      clearAccessToken();
      return { authenticated: false };
    }
  },

  getProfile: async (): Promise<{ user: any }> => {
    const token = getAccessToken();
    if (!token) throw new Error('No access token');

    const capabilities = await getBackendCapabilities();

    // Prefer server-validated identity when backend supports it.
    if (capabilities.mode === 'worker') {
      try {
        const profile = await apiRequest<{ user: any; profile?: any | null }>('/auth/me');
        const mappedRole = profile?.profile?.role === 'company_admin'
          ? 'admin'
          : profile?.profile?.role === 'viewer'
            ? 'client'
            : profile?.profile?.role || profile?.user?.user_metadata?.role;

        return {
          user: {
            ...profile.user,
            user_metadata: {
              ...(profile.user?.user_metadata || {}),
              ...(mappedRole ? { role: mappedRole } : {}),
            },
            profile: profile.profile || null,
          },
        };
      } catch {
        // Fall back to token decode if /auth/me is temporarily unavailable.
      }
    }

    const payload = decodeJwtPayload(token);
    const exp = typeof payload.exp === 'number' ? payload.exp : 0;
    if (exp > 0 && Date.now() >= exp * 1000) {
      throw new Error('Access token expired');
    }

    return {
      user: {
        id: payload.sub,
        email: payload.email,
        user_metadata: payload.user_metadata || {},
      },
    };
  },
};

// Measurements API
export const measurementsApi = {
  getAll: async (): Promise<Measurement[]> => {
    const response = await apiRequest<{ data: any[] }>('/measurements');
    return (response.data || []).map((item) => ({
      id: item.id,
      plant_id: item.plant_id,
      parameter_id: item.parameter_id,
      parameter_key: String(item.parameters?.name || '').toLowerCase(),
      value: item.value,
      type: item.type,
      timestamp: item.timestamp,
      operator_id: item.operator_id,
      parameter_name: item.parameters?.display_name || item.parameters?.name,
      plant_name: item.plants?.name,
      unit: item.parameters?.unit,
    }));
  },
  
  getRecent: async (limit: number = 10): Promise<Measurement[]> => {
    const response = await apiRequest<{ data: any[] }>(`/measurements?limit=${limit}`);
    return (response.data || []).map((item) => ({
      id: item.id,
      plant_id: item.plant_id,
      parameter_id: item.parameter_id,
      parameter_key: String(item.parameters?.name || '').toLowerCase(),
      value: item.value,
      type: item.type,
      timestamp: item.timestamp,
      operator_id: item.operator_id,
      parameter_name: item.parameters?.display_name || item.parameters?.name,
      plant_name: item.plants?.name,
      unit: item.parameters?.unit,
    }));
  },
  
  create: async (data: {
    timestamp?: string;
    ph?: number | null;
    cod?: number | null;
    bod?: number | null;
    tss?: number | null;
    ammonia?: number | null;
    nitrate?: number | null;
    phosphate?: number | null;
    temperature?: number | null;
    flow?: number | null;
    type?: 'influent' | 'effluent';
    plant_id?: number | string;
    operator_id?: number;
    notes?: string;
  }): Promise<any> => {
    // Compatibility path: old UI submits all parameters in one payload.
    // Worker API expects one measurement per parameter.
    const parametersResponse = await apiRequest<{ data: any[] }>('/parameters?active=true');
    const parameters = parametersResponse.data || [];
    const parameterMap = new Map(parameters.map((p) => [String(p.name).toLowerCase(), p.id]));

    const paramEntries: Array<[string, number | null | undefined]> = [
      ['ph', data.ph],
      ['cod', data.cod],
      ['bod', data.bod],
      ['tss', data.tss],
      ['ammonia', data.ammonia],
      ['nitrate', data.nitrate],
      ['phosphate', data.phosphate],
      ['temperature', data.temperature],
      ['flow', data.flow],
    ];

    const plantId = String(data.plant_id || '').trim();
    if (!plantId) {
      throw new Error('Missing plant_id. Select a valid plant from backend list.');
    }

    const created: any[] = [];
    for (const [name, value] of paramEntries) {
      if (value === null || value === undefined || Number.isNaN(value)) continue;
      const parameterId = parameterMap.get(name);
      if (!parameterId) continue;

      const result = await apiRequest<{ data: any }>('/measurements', {
        method: 'POST',
        body: JSON.stringify({
          plant_id: plantId,
          parameter_id: parameterId,
          value,
          type: data.type || 'effluent',
          timestamp: data.timestamp,
          notes: data.notes,
        }),
      });
      if (result?.data) created.push(result.data);
    }

    if (created.length === 0) {
      throw new Error('No measurement values were submitted.');
    }

    return { created_count: created.length, data: created };
  },
  
  validate: async (parameterId: number, value: number, type: 'influent' | 'effluent'): Promise<{
    valid: boolean;
    message?: string;
    warning?: string;
  }> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyValidationApi) {
      return { valid: true, warning: 'Server-side validation endpoint is not available on current backend.' };
    }
    return apiRequest('/api/validation/check', {
      method: 'POST',
      body: JSON.stringify({
        parameter_id: parameterId,
        value,
        type,
      }),
    });
  },
};

// Alerts API
export const alertsApi = {
  getAll: async (): Promise<Alert[]> => {
    const response = await apiRequest<{ data: any[] }>('/alerts?resolved=false&limit=50');
    return (response.data || []).map((item) => {
      const measurement = item.measurements || {};
      const parameter = measurement.parameters?.display_name || measurement.parameters?.name || 'Unknown';
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
      message: item.message || `${item.parameter || 'Parameter'}: ${item.status || item.severity || 'warning'} (${item.value ?? '-'})`,
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

export const plantsApi = {
  getAll: async (): Promise<Array<{ id: string; name: string; location?: string }>> => {
    const response = await apiRequest<{ data: any[] }>('/plants');
    return (response.data || []).map((p) => ({
      id: p.id,
      name: p.name,
      location: p.location,
    }));
  },
};

// Parameters API
export const parametersApi = {
  getAll: async (): Promise<Parameter[]> => {
    const [parametersResponse, standardsResponse] = await Promise.all([
      apiRequest<{ data: any[] }>('/parameters'),
      apiRequest<{ data: any[] }>('/standards'),
    ]);

    const standardsByParameterId = new Map<string, any>();
    (standardsResponse.data || []).forEach((std) => {
      if (!standardsByParameterId.has(std.parameter_id)) {
        standardsByParameterId.set(std.parameter_id, std);
      }
    });

    return (parametersResponse.data || []).map((p) => {
      const std = standardsByParameterId.get(p.id);
      return {
        id: p.id,
        parameter: p.name,
        min_limit: std?.min_value ?? 0,
        max_limit: std?.max_value ?? 0,
      };
    });
  },
  
  create: async (parameter: string, min_limit: number, max_limit: number): Promise<Parameter> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyParameterWriteApi) {
      throw new Error('Parameter creation is not available on the Worker API yet.');
    }
    const response = await apiRequest<Parameter>('/api/parameters', {
      method: 'POST',
      body: JSON.stringify({ parameter, min_limit, max_limit }),
    });
    return response;
  },
  
  update: async (parameterName: string, data: Partial<Parameter>): Promise<Parameter> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyParameterWriteApi) {
      throw new Error(`Parameter update for "${parameterName}" is not available on the Worker API yet.`);
    }
    const response = await apiRequest<Parameter>(`/api/parameters/${parameterName}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return response;
  },
  
  delete: async (parameterName: string): Promise<{success: boolean}> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyParameterWriteApi) {
      throw new Error(`Parameter delete for "${parameterName}" is not available on the Worker API yet.`);
    }
    return apiRequest<{ success: boolean }>(`/api/parameters/${parameterName}`, {
      method: 'DELETE',
    });
  },
};

// Dashboard API
export const dashboardApi = {
  getData: async (): Promise<DashboardData> => {
    const response = await apiRequest<{ data: any[] }>('/measurements?limit=500');
    const measurements = response.data || [];

    const paramKeys = ['ph', 'cod', 'bod', 'tss', 'ammonia', 'nitrate', 'phosphate', 'temperature', 'flow'];
    const groupedByDate: Record<string, Record<string, number>> = {};

    for (const m of measurements) {
      const key = String(m.parameters?.name || '').toLowerCase();
      if (!paramKeys.includes(key)) continue;
      const date = new Date(m.timestamp).toISOString().slice(0, 10);
      groupedByDate[date] ||= {};
      // Prefer effluent values for dashboard summary trend line.
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
      measurementsApi.getRecent(300),
      alertsApi.getAll(),
    ]);

    const paramConfig: Record<string, { label: string; unit: string; min: number; max: number; color: string }> = {
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

    const grouped: Record<string, Record<string, { influent?: number; effluent?: number }>> = {};
    const latestMeasurementsByType: Record<'influent' | 'effluent', Record<string, any>> = {
      influent: {},
      effluent: {},
    };
    let compliantCount = 0;
    let totalCount = 0;

    for (const m of measurements) {
      const key = String(m.parameter_key || '').toLowerCase();
      if (!paramConfig[key]) continue;
      const measurementType = m.type === 'influent' || m.type === 'effluent' ? m.type : 'effluent';
      const timestamp = new Date(m.timestamp).getTime();

      grouped[new Date(m.timestamp).toISOString().slice(0, 10)] ||= {};
      grouped[new Date(m.timestamp).toISOString().slice(0, 10)][key] ||= {};
      grouped[new Date(m.timestamp).toISOString().slice(0, 10)][key][measurementType] = Number(m.value);

      const existing = latestMeasurementsByType[measurementType][key];
      if (!existing || timestamp > new Date(existing.timestamp).getTime()) {
        latestMeasurementsByType[measurementType][key] = m;
      }

      totalCount += 1;
      if (m.value >= paramConfig[key].min && m.value <= paramConfig[key].max) {
        compliantCount += 1;
      }
    }

    const dates = Object.keys(grouped).sort();
    const buildParameterStatus = (type: 'influent' | 'effluent') =>
      Object.keys(paramConfig).map((key) => {
        const latest = latestMeasurementsByType[type][key];
        const value = Number(latest?.value ?? 0);
        const cfg = paramConfig[key];
        const margin = (cfg.max - cfg.min) * 0.1;
        let status: 'good' | 'warning' | 'critical' = 'good';

        if (latest) {
          if (value < cfg.min || value > cfg.max) status = 'critical';
          else if (value < cfg.min + margin || value > cfg.max - margin) status = 'warning';
        }

        return {
          key,
          name: cfg.label,
          value,
          unit: cfg.unit,
          status,
          standard: `${cfg.min}-${cfg.max}`,
          color: cfg.color,
        };
      });

    const parameterStatusesInfluent = buildParameterStatus('influent');
    const parameterStatusesEffluent = buildParameterStatus('effluent');

    const chartSeries: Record<string, ChartSeriesDTO> = {};
    Object.keys(paramConfig).forEach((key) => {
      chartSeries[key] = {
        labels: dates.slice(-10),
        influent: dates.slice(-10).map((d) => grouped[d]?.[key]?.influent ?? 0),
        effluent: dates.slice(-10).map((d) => grouped[d]?.[key]?.effluent ?? grouped[d]?.[key]?.influent ?? 0),
      };
    });

    return {
      parameterStatusesInfluent,
      parameterStatusesEffluent,
      chartSeries,
      recentAlerts: alerts.slice(0, 5),
      complianceRate: totalCount > 0 ? Math.round((compliantCount / totalCount) * 100) : 100,
      totalReadings: measurements.length,
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

// Reports API
export const reportsApi = {
  generateDaily: async (): Promise<any> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyReportMetricsApi) {
      throw new Error('Daily report endpoint is not available on Worker API yet.');
    }
    return apiRequest('/api/reports/daily');
  },
  
  generatePDF: async (parameters?: string[]): Promise<Blob> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyReportPdfApi) {
      throw new Error('PDF report endpoint is not available on Worker API yet.');
    }
    const url = parameters && parameters.length > 0 
      ? `/api/reports/pdf?parameters=${parameters.join(',')}`
      : '/api/reports/pdf';
    
    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}${url}`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to generate PDF: ${response.status}`);
    }
    
    return await response.blob();
  },
};

// Data Import/Export API
export const dataApi = {
  import: async (file: File): Promise<any> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyDataImportApi) {
      throw new Error('CSV import endpoint is not available on Worker API yet.');
    }
    const formData = new FormData();
    formData.append('file', file);
    
    return apiRequest('/api/data/import', {
      method: 'POST',
      body: formData,
      headers: {
        // Remove Content-Type for FormData
      },
    });
  },
  
  export: async (): Promise<Blob> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyDataExportApi) {
      throw new Error('CSV export endpoint is not available on Worker API yet.');
    }
    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}/api/data/export`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    
    if (!response.ok) {
      throw new Error(`Failed to export data: ${response.status}`);
    }
    
    return await response.blob();
  },
};

// Data Management API
export const dataManagementApi = {
  getCount: async (): Promise<{ count: number; message: string }> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyDataCountApi) {
      throw new Error('Data count endpoint is not available on Worker API yet.');
    }
    return apiRequest<{ count: number; message: string }>('/api/data/count');
  },
  
  clearAll: async (): Promise<{ success: boolean; message: string; count: number }> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyDataClearApi) {
      throw new Error('Data clear endpoint is not available on Worker API yet.');
    }
    return apiRequest<{ success: boolean; message: string; count: number }>('/api/data/clear', {
      method: 'DELETE',
    });
  },
  
  clearByDateRange: async (startDate: string, endDate: string): Promise<{ success: boolean; message: string; count: number }> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyDataClearApi) {
      throw new Error('Date-range clear endpoint is not available on Worker API yet.');
    }
    return apiRequest<{ success: boolean; message: string; count: number }>(`/api/data/clear/${startDate}/${endDate}`, {
      method: 'DELETE',
    });
  },
};

// Check if backend is available
export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: 'HEAD',
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// User Management API
export interface User {
  id: string;
  username: string;
  role: 'admin' | 'operator' | 'client';
}

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyUserListApi) {
      throw new Error('User listing is not available on the Worker API yet.');
    }
    return apiRequest<User[]>('/api/users');
  },
  
  create: async (username: string, password: string, role: string): Promise<{success: boolean; id: string; username: string; role: string}> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyUserCreateApi) {
      throw new Error('User creation is not available on the Worker API yet.');
    }
    return apiRequest<{ success: boolean; id: string; username: string; role: string }>('/api/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });
  },
  
  delete: async (userId: string): Promise<{success: boolean}> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyUserDeleteApi) {
      throw new Error('User deletion is not available on the Worker API yet.');
    }
    return apiRequest<{ success: boolean }>(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  },
};