/**
 * Measurements API — CRUD operations for water quality measurements.
 */

import { apiRequest } from './client';
import { getBackendCapabilities } from './capabilities';
import type { Measurement } from './types';

/** Map a raw API measurement row into our normalized Measurement shape. */
const mapMeasurement = (item: any): Measurement => ({
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
});

export const measurementsApi = {
  getAll: async (): Promise<Measurement[]> => {
    const response = await apiRequest<{ data: any[] }>('/measurements');
    return (response.data || []).map(mapMeasurement);
  },

  getRecent: async (limit: number = 10, forceFresh: boolean = false): Promise<Measurement[]> => {
    const cacheBust = forceFresh ? `&_ts=${Date.now()}` : '';
    const response = await apiRequest<{ data: any[] }>(`/measurements?limit=${limit}${cacheBust}`);
    return (response.data || []).map(mapMeasurement);
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
    local_timestamp?: string;
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
          local_timestamp: data.local_timestamp,
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

  validate: async (
    parameterId: number,
    value: number,
    type: 'influent' | 'effluent',
  ): Promise<{ valid: boolean; message?: string; warning?: string }> => {
    const capabilities = await getBackendCapabilities();
    if (!capabilities.supportsLegacyValidationApi) {
      return { valid: true, warning: 'Server-side validation endpoint is not available on current backend.' };
    }
    return apiRequest('/api/validation/check', {
      method: 'POST',
      body: JSON.stringify({ parameter_id: parameterId, value, type }),
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

export const uploadImage = async (data: string | File): Promise<string | null> => {
  try {
    let body: BodyInit
    let contentType: string

    if (typeof data === 'string') {
      body = JSON.stringify({ imageBase64: data })
      contentType = 'application/json'
    } else {
      body = data
      contentType = data.type || 'image/jpeg'
    }

    // Use the correct token key (same as getAccessToken in client.ts)
    const token = localStorage.getItem('ww_access_token')

    const apiBase = import.meta.env.VITE_API_URL || 'https://wastewater-api.juankael37.workers.dev'
    const response = await fetch(`${apiBase}/measurements/upload-image`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body,
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Image upload failed:', response.status, errText)
      return null
    }

    const result = await response.json()
    return result.url || null
  } catch (error) {
    console.error('Image upload error:', error)
    return null
  }
}

