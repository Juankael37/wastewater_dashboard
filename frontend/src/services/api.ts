/**
 * API Service for connecting to Flask backend
 */

// Determine API base URL based on current host
const getApiBaseUrl = () => {
  // Use environment variable if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // If accessing from localhost, use localhost for backend
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000';
  }
  
  // If accessing from network IP (like 192.168.1.4), use the same IP for backend
  // Replace with your computer's actual IP if different
  return `http://${window.location.hostname}:5000`;
};

const API_BASE_URL = getApiBaseUrl();

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
  name: string;
  unit: string;
  min_value: number | null;
  max_value: number | null;
  validation_rules: string | null;
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
  
  // Determine if we should include Content-Type header
  // Don't include it for FormData (browser will set it automatically)
  const isFormData = options.body instanceof FormData;
  
  const defaultOptions: RequestInit = {
    headers: isFormData
      ? {
          'X-Requested-With': 'XMLHttpRequest',
          ...options.headers
        } // No Content-Type for FormData
      : {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...options.headers,
        },
    credentials: 'include', // Include cookies for Flask session
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    console.log(`[DEBUG apiRequest] ${endpoint} - Status: ${response.status}`);
    console.log(`[DEBUG apiRequest] ${endpoint} - Content-Type: ${response.headers.get('content-type')}`);
    console.log(`[DEBUG apiRequest] ${endpoint} - URL: ${response.url}`);
    
    // Special handling for login endpoint - 302 is success
    if (endpoint === '/login' && response.status === 302) {
      // Login successful, return empty object
      console.log('[DEBUG apiRequest] Login successful (302 redirect)');
      return {} as T;
    }
    
    // Check if we were redirected to login page (getting HTML instead of JSON)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error(`[DEBUG apiRequest] ${endpoint} - Received HTML instead of JSON (likely redirected to login)`);
      throw new Error('Authentication required - session expired or not logged in');
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }
    
    // Check if response is JSON
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text() as T;
  } catch (error) {
    console.error(`[DEBUG apiRequest] Request failed for ${endpoint}:`, error);
    throw error;
  }
}

// Authentication API
export const authApi = {
  login: async (username: string, password: string): Promise<{success: boolean, message: string, username: string}> => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    return apiRequest<{success: boolean, message: string, username: string}>('/login', {
      method: 'POST',
      body: formData,
      headers: {
        // Remove Content-Type for FormData, browser will set it with boundary
      },
    });
  },
  
  logout: async (): Promise<void> => {
    await apiRequest('/logout', { method: 'POST' });
  },
  
  register: async (username: string, password: string, email?: string): Promise<void> => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    if (email) formData.append('email', email);
    
    await apiRequest('/register', {
      method: 'POST',
      body: formData,
    });
  },
  
  checkAuth: async (): Promise<{ authenticated: boolean; username?: string }> => {
    try {
      // Try to access a protected endpoint
      await apiRequest<any>('/api/data');
      // If successful, we're authenticated
      // For now, return a default username since /api/data doesn't return user info
      return { authenticated: true, username: 'admin' };
    } catch (error) {
      return { authenticated: false };
    }
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
  
  update: async (parameterName: string, data: Partial<Parameter>): Promise<Parameter> => {
    return apiRequest<Parameter>(`/api/parameters/${parameterName}`, {
      method: 'PUT',
      body: JSON.stringify(data),
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
  role: string;
}

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    return apiRequest<User[]>('/api/users');
  },
  
  create: async (username: string, password: string): Promise<{success: boolean; id: number; username: string}> => {
    return apiRequest('/api/users', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  },
  
  delete: async (userId: number): Promise<{success: boolean}> => {
    return apiRequest(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  },
};