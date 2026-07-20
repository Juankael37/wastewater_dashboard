/**
 * Authentication API — login, register, logout, profile, and session checks.
 */

import { apiRequest, getAccessToken, setAccessToken, clearAccessToken, decodeJwtPayload } from './client';
import { getBackendCapabilities } from './capabilities';

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
    role: 'admin' | 'operator' | 'client' = 'operator',
  ): Promise<{ user: any; session: any; needsConfirmation?: boolean }> => {
    const result = await apiRequest<{ user: any; session: any; needsConfirmation?: boolean }>('/auth/register', {
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

  resendVerification: async (email: string): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  verifyEmail: async (token: string): Promise<{ session: any }> => {
    return apiRequest<{ session: any }>('/auth/verify', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  checkAuth: async (): Promise<{ authenticated: boolean; user?: any }> => {
    const token = getAccessToken();
    if (!token) return { authenticated: false };

    try {
      const response = await authApi.getProfile();
      return { authenticated: true, user: response.user };
    } catch {
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
        const mappedRole =
          profile?.profile?.role === 'company_admin'
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
