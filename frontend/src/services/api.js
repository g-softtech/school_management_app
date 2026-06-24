// Lives at: frontend/src/services/api.js
//
// ─────────────────────────────────────────────────────────────────────────────
// Centralized Axios Instance — Multi-Tenant Edition
//
// Request interceptor stack (fires in order on every outbound call):
//   1. Attach Bearer token from localStorage
//   2. Attach X-Tenant-ID header from the tenant resolution utility
//
// Response interceptor:
//   • 401 auto-refresh: silently exchanges the refresh cookie for a new
//     access token and replays the original request.
//   • Hard 401 (refresh fails): clears session and redirects to /login.
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios';
import { API_URL } from '../utils/constants';
import { getCurrentTenant } from '../utils/tenant';

const api = axios.create({
  baseURL:         API_URL,
  withCredentials: true,                          // required for httpOnly refresh cookie
  headers:         { 'Content-Type': 'application/json' },
});

// ─── REQUEST INTERCEPTOR 1: Bearer token ─────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── REQUEST INTERCEPTOR 2: X-Tenant-ID ──────────────────────────────────────
// Fires after the auth interceptor on every outbound request.
// getCurrentTenant() resolves the correct identifier via the 5-tier fallback
// chain defined in utils/tenant.js:
//   subdomain → localStorage tenantId (post-login) → VITE_DEV_TENANT → 'demo'
api.interceptors.request.use(
  (config) => {
    const tenantId = getCurrentTenant();
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── RESPONSE INTERCEPTOR: 401 auto-refresh ───────────────────────────────────
// On a 401, attempts a silent token refresh using the httpOnly cookie.
// If the refresh itself fails (expired/rotated), clears storage and redirects.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const res = await axios.post(
          `${API_URL}/auth/refresh`,
          {},
          {
            withCredentials: true,
            // Manually re-attach X-Tenant-ID for the refresh call since it
            // bypasses the instance interceptors when called via plain axios.
            headers: { 'X-Tenant-ID': getCurrentTenant() },
          }
        );
        const newToken = res.data.accessToken;
        localStorage.setItem('accessToken', newToken);
        original.headers.Authorization       = `Bearer ${newToken}`;
        original.headers['X-Tenant-ID']      = getCurrentTenant();
        return api(original);
      } catch {
        // Refresh failed — hard logout
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        localStorage.removeItem('tenantId');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;