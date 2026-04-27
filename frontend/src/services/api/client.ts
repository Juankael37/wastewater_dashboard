/**
 * Core API client — base URL resolution, token management, and the shared
 * `apiRequest` helper used by every domain-specific API module.
 */

const getApiBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  // Worker-first default prevents mobile/PWA builds from falling back to localhost.
  return 'https://wastewater-api.juankael37.workers.dev';
};

export const API_BASE_URL = getApiBaseUrl();

const ACCESS_TOKEN_KEY = 'ww_access_token';

// ---------------------------------------------------------------------------
// Token helpers
// ---------------------------------------------------------------------------

export const getAccessToken = (): string | null =>
  localStorage.getItem(ACCESS_TOKEN_KEY);

export const setAccessToken = (token: string): void =>
  localStorage.setItem(ACCESS_TOKEN_KEY, token);

export const clearAccessToken = (): void =>
  localStorage.removeItem(ACCESS_TOKEN_KEY);

export const decodeJwtPayload = (token: string): any => {
  try {
    return JSON.parse(atob(token.split('.')[1] || 'e30='));
  } catch {
    return {};
  }
};

// ---------------------------------------------------------------------------
// Generic API request helper
// ---------------------------------------------------------------------------

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const isFormData = options.body instanceof FormData;
  const token = getAccessToken();

  const defaultOptions: RequestInit = {
    headers: isFormData
      ? {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
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

    return (await response.text()) as T;
  } catch (error) {
    console.error(`[API] Request failed for ${endpoint}:`, error);
    if (error instanceof TypeError) {
      throw new Error(
        `Network request failed for ${url}. Verify this API URL is reachable from your device.`,
      );
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

export const getConfiguredApiBaseUrl = (): string => API_BASE_URL;

export const formatTimeAgo = (timestamp?: string): string => {
  if (!timestamp) return 'Unknown';
  const tsWithZ =
    timestamp.endsWith('Z') || timestamp.includes('+')
      ? timestamp
      : `${timestamp}Z`;
  const now = new Date();
  const eventTime = new Date(tsWithZ);
  const diffMs = now.getTime() - eventTime.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return 'Just now';
};
