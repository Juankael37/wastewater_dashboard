/**
 * API Service for connecting to Flask backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
  measurement_id: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  resolved: boolean;
  created_at: string;
  parameter_name?: string;
  value?: number;
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
  recent_measurements: Measurement[];
  alerts: Alert[];
  summary: {
    total_measurements: number;
    total_alerts: number;
    compliance_rate: number;
  };
}

// Helper function for API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include cookies for Flask session
  };

  try {
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error (${response.status}): ${errorText}`);
    }
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return await response.text() as T;
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error);
    throw error;
  }
}

// Authentication API
export const authApi = {
  login: async (username: string, password: string): Promise<void> => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    await apiRequest('/login', {
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
      const response = await apiRequest<any>('/api/data');
      return { authenticated: true, username: response.user?.username };
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
    plant_id: number;
    parameter_id: number;
    value: number;
    type: 'influent' | 'effluent';
    timestamp?: string;
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