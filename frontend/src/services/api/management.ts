/**
 * Reports, Parameters, Users, and Data Management APIs.
 */

import { apiRequest, getAccessToken, API_BASE_URL } from './client';
import { getBackendCapabilities } from './capabilities';
import type { Parameter, User } from './types';

// ---------------------------------------------------------------------------
// Parameters API
// ---------------------------------------------------------------------------

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
      throw new Error('Parameter creation is not available on the configured backend.');
    }
    return apiRequest<Parameter>('/api/parameters', {
      method: 'POST',
      body: JSON.stringify({ parameter, min_limit, max_limit }),
    });
  },

  update: async (parameterName: string, data: Partial<Parameter>): Promise<Parameter> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyParameterWriteApi) {
      throw new Error(`Parameter update for "${parameterName}" is not available on the configured backend.`);
    }
    return apiRequest<Parameter>(`/api/parameters/${parameterName}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (parameterName: string): Promise<{ success: boolean }> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyParameterWriteApi) {
      throw new Error(`Parameter delete for "${parameterName}" is not available on the configured backend.`);
    }
    return apiRequest<{ success: boolean }>(`/api/parameters/${parameterName}`, {
      method: 'DELETE',
    });
  },
};

// ---------------------------------------------------------------------------
// Reports API
// ---------------------------------------------------------------------------

export interface ReportSettings {
  id: string;
  email: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  is_active: boolean;
  created_at: string;
}

export const reportsApi = {
  generateDaily: async (): Promise<any> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyReportMetricsApi) {
      throw new Error('Daily report endpoint is not available on Worker API yet.');
    }
    return apiRequest('/api/reports/daily');
  },

  generatePDF: async (options?: {
    start?: string;
    end?: string;
    parameters?: string[];
  }): Promise<Blob> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyReportPdfApi) {
      throw new Error('PDF report endpoint is not available on Worker API yet.');
    }
    const params = new URLSearchParams();
    if (options?.start) params.append('start', options.start);
    if (options?.end) params.append('end', options.end);
    if (options?.parameters && options.parameters.length > 0) {
      params.append('parameters', options.parameters.join(','));
    }
    const url = `/api/reports/pdf${params.toString() ? '?' + params.toString() : ''}`;

    const token = getAccessToken();
    const response = await fetch(`${API_BASE_URL}${url}`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMsg = `Failed to generate PDF (${response.status})`;
      try {
        const errJson = JSON.parse(errorText);
        errorMsg = errJson.error || errJson.message || errorMsg;
      } catch {}
      throw new Error(errorMsg);
    }

    return await response.blob();
  },

  generateRichPDF: async (options?: {
    start?: string;
    end?: string;
  }): Promise<Blob> => {
    const token = getAccessToken();
    const params = new URLSearchParams();
    if (options?.start) params.append('start', options.start);
    if (options?.end) params.append('end', options.end);
    const url = `/api/reports/rich-pdf${params.toString() ? '?' + params.toString() : ''}`;

    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: 'POST',
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {})
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Rich PDF failed: ${response.status} - ${errorText}`);
    }

    return await response.blob();
  },

  getScheduled: async (): Promise<ReportSettings[]> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyAdminApi) {
      throw new Error('Scheduled reports endpoint is not available on Worker API yet.');
    }
    return apiRequest<ReportSettings[]>('/api/settings/reports');
  },

  addScheduled: async (email: string, frequency: 'daily' | 'weekly' | 'monthly'): Promise<ReportSettings> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyAdminApi) {
      throw new Error('Scheduled reports endpoint is not available on Worker API yet.');
    }
    return apiRequest<ReportSettings>('/api/settings/reports', {
      method: 'POST',
      body: JSON.stringify({ email, frequency, is_active: true }),
    });
  },

  removeScheduled: async (id: string): Promise<{ success: boolean }> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyAdminApi) {
      throw new Error('Scheduled reports endpoint is not available on Worker API yet.');
    }
    return apiRequest<{ success: boolean }>(`/api/settings/reports/${id}`, {
      method: 'DELETE',
    });
  },

  sendTestReport: async (email: string, frequency: 'daily' | 'weekly' | 'monthly'): Promise<{ success: boolean; message: string }> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyAdminApi) {
      throw new Error('Test report endpoint is not available on Worker API yet.');
    }
    return apiRequest<{ success: boolean; message: string }>('/api/settings/reports/test', {
      method: 'POST',
      body: JSON.stringify({ email, frequency }),
    });
  },
};

// ---------------------------------------------------------------------------
// Data Import/Export API
// ---------------------------------------------------------------------------

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
      headers: {},
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

// ---------------------------------------------------------------------------
// Data Management API
// ---------------------------------------------------------------------------

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

  clearByDateRange: async (
    startDate: string,
    endDate: string,
  ): Promise<{ success: boolean; message: string; count: number }> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyDataClearApi) {
      throw new Error('Date-range clear endpoint is not available on Worker API yet.');
    }
    return apiRequest<{ success: boolean; message: string; count: number }>(
      `/api/data/clear/${startDate}/${endDate}`,
      { method: 'DELETE' },
    );
  },
};

// ---------------------------------------------------------------------------
// Users API
// ---------------------------------------------------------------------------

export const usersApi = {
  getAll: async (): Promise<User[]> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyUserListApi) {
      throw new Error('User listing is not available on the configured backend.');
    }
    return apiRequest<User[]>('/api/users');
  },

  create: async (
    username: string,
    password: string,
    role: string,
  ): Promise<{ success: boolean; id: string; username: string; role: string }> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyUserCreateApi) {
      throw new Error('User creation is not available on the configured backend.');
    }
    return apiRequest<{ success: boolean; id: string; username: string; role: string }>('/api/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    });
  },

  delete: async (userId: string): Promise<{ success: boolean }> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyUserDeleteApi) {
      throw new Error('User deletion is not available on the configured backend.');
    }
    return apiRequest<{ success: boolean }>(`/api/users/${userId}`, {
      method: 'DELETE',
    });
  },
};

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/`, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
};
