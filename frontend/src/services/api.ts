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
  id: number;
  plant_id: number;
  parameter_id: number;
  value: number;
  type: 'influent' | 'effluent';
  timestamp: string;
  operator_id: number;
  parameter_name?: string;
  unit?: string;
}

export interface Alert {
  id: number;
  parameter: string;
  value: number;
  status: string;
  state: string;
  timestamp: string;
  resolved_at: string | null;
}

export interface Parameter {
  id: number;
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
  
  register: async (email: string, password: string, fullName?: string): Promise<{ user: any; session: any }> => {
    const result = await apiRequest<{ user: any; session: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        full_name: fullName || email.split('@')[0],
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
    return apiRequest<Measurement[]>('/api/measurements');
  },
  
  getRecent: async (limit: number = 10): Promise<Measurement[]> => {
    return apiRequest<Measurement[]>(`/api/measurements/recent?limit=${limit}`);
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
    plant_id?: number;
    operator_id?: number;
    notes?: string;
  }): Promise<Measurement> => {
    return apiRequest<Measurement>('/api/measurements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
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
    return apiRequest<Alert[]>('/api/alerts');
  },
  
  getDashboard: async (): Promise<Alert[]> => {
    return apiRequest<Alert[]>('/api/alerts/dashboard');
  },
  
  resolve: async (alertId: number): Promise<void> => {
    await apiRequest(`/api/alerts/${alertId}/resolve`, {
      method: 'POST',
    });
  },
};

// Parameters API
export const parametersApi = {
  getAll: async (): Promise<Parameter[]> => {
    return apiRequest<Parameter[]>('/api/parameters');
  },
  
  create: async (parameter: string, min_limit: number, max_limit: number): Promise<Parameter> => {
    return apiRequest<Parameter>('/api/parameters', {
      method: 'POST',
      body: JSON.stringify({ parameter, min_limit, max_limit }),
    });
  },
  
  update: async (parameterName: string, data: Partial<Parameter>): Promise<Parameter> => {
    return apiRequest<Parameter>(`/api/parameters/${parameterName}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
  
  delete: async (parameterName: string): Promise<{success: boolean}> => {
    return apiRequest(`/api/parameters/${parameterName}`, {
      method: 'DELETE',
    });
  },
};

// Dashboard API
export const dashboardApi = {
  getData: async (): Promise<DashboardData> => {
    return apiRequest<DashboardData>('/api/data');
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
    const response = await fetch(`${API_BASE_URL}/api/data`, {
      method: 'HEAD',
      credentials: 'include',
    });
    return response.ok;
  } catch (error) {
    return false;
  }
};

// User Management API
export interface User {
  id: number;
  username: string;
  role: 'admin' | 'operator' | 'client';
}

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    return apiRequest<User[]>('/api/users');
  },
  
  create: async (username: string, password: string, role: string): Promise<{success: boolean; id: number; username: string; role: string}> => {
    return apiRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });
  },
  
  delete: async (userId: number): Promise<{success: boolean}> => {
    return apiRequest(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  },
};