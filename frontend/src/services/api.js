import axios from 'axios';

/**
 * Parses the current browser URL to extract the sub-tenant string.
 * Hardened to prevent routing crashes on localhost, naked IP addresses,
 * and the primary corporate landing page (thecortexsystems.com).
 * 
 * @returns {string|null} The resolved tenant ID, or null if root level.
 */
const getSubdomain = () => {
  const hostname = window.location.hostname;
  
  // Guard 1: Local development environments
  if (
    hostname === 'localhost' || 
    hostname === '127.0.0.1' || 
    hostname.startsWith('192.168.')
  ) {
    // Allows developers to dynamically mock a school locally
    return localStorage.getItem('dev_tenant_id') || 'greensprings';
  }

  // Guard 2: Root apex domain and generic www fallback
  if (
    hostname === 'thecortexsystems.com' || 
    hostname === 'www.thecortexsystems.com' || 
    hostname === 'www'
  ) {
    return null; // Public root website; no specific tenant context
  }

  // Extract subdomain securely. E.g., 'greensprings.thecortexsystems.com' -> 'greensprings'
  const parts = hostname.split('.');
  
  // Ensure we actually have a subdomain (needs at least 3 parts: sub.domain.tld)
  if (parts.length >= 3) {
    const subdomain = parts[0];
    if (subdomain !== 'www') {
      return subdomain;
    }
  }
  
  return null;
};

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
    // The backend's tenantContext middleware strictly requires this header.
    const tenantId = getSubdomain();
    if (tenantId) {
      if (config.headers.set) {
        config.headers.set('X-Tenant-ID', tenantId);
      } else {
        config.headers['X-Tenant-ID'] = tenantId;
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
      localStorage.removeItem('user');
      
      // Only redirect if we are not already on an auth or public page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        window.location.href = '/login?expired=true';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;