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

const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
const setAccessToken = (token: string) => localStorage.setItem(ACCESS_TOKEN_KEY, token);
const clearAccessToken = () => localStorage.removeItem(ACCESS_TOKEN_KEY);

// Types
export interface Measurement {
  id: string;
  plant_id: string;
  parameter_id: string;
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
    const response = await fetch(url, { ...defaultOptions, ...options });

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
    const payload = JSON.parse(atob(token.split('.')[1] || 'e30='));
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
      value: item.value,
      type: item.type,
      timestamp: item.timestamp,
      operator_id: item.operator_id,
      parameter_name: item.parameters?.display_name || item.parameters?.name,
      plant_name: item.plants?.name,
      unit: item.parameters?.unit,
      [item.parameters?.name || 'value']: item.value,
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
      return {
        id: item.id,
        parameter,
        value: measurement.value,
        status: item.severity || (item.resolved ? 'resolved' : 'warning'),
        state: item.resolved ? 'resolved' : 'active',
        timestamp: item.created_at || measurement.timestamp,
        resolved_at: item.resolved_at || null,
      };
    });
  },
  
  getDashboard: async (): Promise<Alert[]> => {
    return apiRequest<Alert[]>('/api/alerts/dashboard');
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
  
  create: async (_parameter: string, _min_limit: number, _max_limit: number): Promise<Parameter> => {
    throw new Error('Parameter creation is not implemented on the Worker API yet.');
  },
  
  update: async (parameterName: string, _data: Partial<Parameter>): Promise<Parameter> => {
    throw new Error(`Parameter update for "${parameterName}" is not implemented on the Worker API yet.`);
  },
  
  delete: async (parameterName: string): Promise<{success: boolean}> => {
    throw new Error(`Parameter delete for "${parameterName}" is not implemented on the Worker API yet.`);
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
  
  getSummary: async (): Promise<any> => {
    return apiRequest('/api/reports/summary');
  },
  
  getPerformance: async (): Promise<any> => {
    return apiRequest('/api/reports/performance');
  },
};

// Reports API
export const reportsApi = {
  generateDaily: async (): Promise<any> => {
    return apiRequest('/api/reports/daily');
  },
  
  generatePDF: async (parameters?: string[]): Promise<Blob> => {
    const url = parameters && parameters.length > 0 
      ? `/api/reports/pdf?parameters=${parameters.join(',')}`
      : '/api/reports/pdf';
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
      credentials: 'include',
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
    const response = await fetch(`${API_BASE_URL}/api/data/export`, {
      credentials: 'include',
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
    return apiRequest<{ count: number; message: string }>('/api/data/count');
  },
  
  clearAll: async (): Promise<{ success: boolean; message: string; count: number }> => {
    return apiRequest<{ success: boolean; message: string; count: number }>('/api/data/clear', {
      method: 'DELETE',
    });
  },
  
  clearByDateRange: async (startDate: string, endDate: string): Promise<{ success: boolean; message: string; count: number }> => {
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
    throw new Error('User management endpoints are not implemented on the Worker API yet.');
  },
  
  create: async (_username: string, _password: string, _role: string): Promise<{success: boolean; id: string; username: string; role: string}> => {
    throw new Error('User creation is not implemented on the Worker API yet.');
  },
  
  delete: async (_userId: string): Promise<{success: boolean}> => {
    throw new Error('User deletion is not implemented on the Worker API yet.');
  },
};