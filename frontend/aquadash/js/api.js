/**
 * AquaDash API Service
 * Communicates with the Worker API and Supabase
 */

const API_BASE_URL = 'https://wastewater-api.juankael37.workers.dev';
const ACCESS_TOKEN_KEY = 'aq_access_token';
const CURRENT_USER_KEY = 'aq_current_user';

class AquaDashAPI {
  constructor() {
    this.token = localStorage.getItem(ACCESS_TOKEN_KEY);
    this.currentUser = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
  }

  // Auth
  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    this.token = data.session.access_token;
    localStorage.setItem(ACCESS_TOKEN_KEY, this.token);
    
    // Fetch user profile for role
    const profile = await this.getProfile();
    this.currentUser = profile.user;
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(this.currentUser));
    
    return data;
  }

  async logout() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    this.token = null;
    this.currentUser = null;
  }

  async getProfile() {
    return this._request('/auth/me');
  }

  async checkAuth() {
    try {
      const profile = await this.getProfile();
      return { authenticated: true, user: profile.user, profile: profile.profile };
    } catch (error) {
      return { authenticated: false };
    }
  }

  // Dashboard
  async getMeasurements() {
    return this._request('/measurements');
  }

  async getRecentMeasurements(limit = 50) {
    return this._request(`/measurements?limit=${limit}`);
  }

  async getAlerts() {
    return this._request('/alerts');
  }

  async getAlertsDashboard() {
    return this._request('/api/alerts/dashboard');
  }

  async resolveAlert(alertId) {
    return this._request(`/alerts/${alertId}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ resolved_at: new Date().toISOString() })
    });
  }

  // Reports
  async getReportSummary() {
    return this._request('/api/reports/summary');
  }

  async getReportPerformance() {
    return this._request('/api/reports/performance');
  }

  async getDailyReport() {
    return this._request('/api/reports/daily');
  }

  async getPdfReport(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `/api/reports/pdf?${query}` : '/api/reports/pdf';
    const response = await fetch(`${API_BASE_URL}${url}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });

    if (!response.ok) throw new Error('Failed to generate PDF');
    return response.blob();
  }

  async exportCsv(params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `/api/data/export?${query}` : '/api/data/export';
    return this._request(url);
  }

  // Parameters
  async getParameters() {
    return this._request('/parameters');
  }

  async getStandards() {
    return this._request('/standards');
  }

  async updateParameter(name, data) {
    return this._request(`/api/parameters/${name}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async createParameter(data) {
    return this._request('/api/parameters', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteParameter(name) {
    return this._request(`/api/parameters/${name}`, {
      method: 'DELETE'
    });
  }

  // Users
  async getUsers() {
    return this._request('/api/users');
  }

  async createUser(data) {
    return this._request('/api/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteUser(userId) {
    return this._request(`/api/users/${userId}`, {
      method: 'DELETE'
    });
  }

  // Data Management
  async getDataCount() {
    return this._request('/api/data/count');
  }

  async clearAllData() {
    return this._request('/api/data/clear', {
      method: 'DELETE'
    });
  }

  async clearDataRange(startDate, endDate) {
    return this._request(`/api/data/clear/${startDate}/${endDate}`, {
      method: 'DELETE'
    });
  }

  async importData(csvData) {
    const formData = new FormData();
    formData.append('file', csvData);
    return this._request('/api/data/import', {
      method: 'POST',
      body: formData,
      noJsonHeader: true
    });
  }

  // Helper method
  async _request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const { noJsonHeader, ...fetchOptions } = options;

    const defaultHeaders = noJsonHeader ? {} : { 'Content-Type': 'application/json' };
    if (this.token) {
      defaultHeaders['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...fetchOptions,
      headers: {
        ...defaultHeaders,
        ...(fetchOptions.headers || {})
      }
    });

    if (response.status === 401) {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(CURRENT_USER_KEY);
      
      // Don't redirect if we're already on the login page (prevents infinite redirect loop)
      const isLoginPage = window.location.pathname.includes('login');
      if (!isLoginPage) {
        window.location.href = './login.html';
      }
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${error}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return response;
  }

  isAdmin() {
    const userRole = this.currentUser?.user_metadata?.role;
    const profileRole = this.currentUser?.profile?.role;
    
    // Check if user has admin role in either location
    return ['admin', 'company_admin', 'super_admin'].includes(userRole) || 
           ['admin', 'company_admin', 'super_admin'].includes(profileRole);
  }

  isAuthenticated() {
    return !!this.token && !!this.currentUser;
  }
}

const api = new AquaDashAPI();
