import axios from 'axios';

import { getCurrentTenant } from '../utils/tenant';

import { API_URL } from '../utils/constants';

// ─── Create the Enterprise Axios Singleton ───────────────────────────────────
const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// ─── Global Request Interceptor ──────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    // 1. Authenticated User Token Injection
    const token = localStorage.getItem('token');
    if (token) {
      if (config.headers.set) {
        config.headers.set('Authorization', `Bearer ${token}`);
      } else {
        config.headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // 2. Multi-Tenant Subdomain Injection
    // Check if the route already manually provided an X-Tenant-ID (e.g. Workspace selection login)
    const hasManualTenant = config.headers.has 
      ? config.headers.has('X-Tenant-ID') 
      : !!config.headers['X-Tenant-ID'];

    if (!hasManualTenant) {
      const tenantId = getCurrentTenant();
      if (tenantId) {
        if (config.headers.set) {
          config.headers.set('X-Tenant-ID', tenantId);
        } else {
          config.headers['X-Tenant-ID'] = tenantId;
        }
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ─── Global Response Interceptor ─────────────────────────────────────────────
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle global authentication failures seamlessly
    if (error.response && error.response.status === 401) {
      // Safely wipe invalid credentials to prevent infinite redirect loops
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      
      // Only redirect if we are not already on an auth or public page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        if (currentPath.startsWith('/platform')) {
          window.location.href = '/platform/login?expired=true';
        } else {
          window.location.href = '/login?expired=true';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;