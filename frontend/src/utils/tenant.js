// Lives at: frontend/src/utils/tenant.js
//
// ─────────────────────────────────────────────────────────────────────────────
// Tenant Resolution Utility
//
// The multi-tenant frontend strategy:
//   1. Production: read the subdomain from `window.location.hostname`.
//      e.g. "greensprings.smartschool.com" → "greensprings"
//   2. Localhost dev: no subdomain exists, so fall through to:
//      a. A `VITE_DEV_TENANT` env variable (set in .env.local for each dev)
//      b. A `__dev_tenant__` key in localStorage (set via browser console)
//      c. A hardcoded safe fallback: "demo"
//   3. After login: the server response embeds the authoritative `tenantId`
//      (a cuid string). We persist this to localStorage as `tenantId` so
//      the Axios interceptor can fall back to it on flat IPs or bare domains.
//
// Resolution priority (highest → lowest):
//   subdomain → localStorage `tenantId` (post-login cuid) → VITE_DEV_TENANT → "demo"
// ─────────────────────────────────────────────────────────────────────────────

const PROD_BASE_DOMAINS = [
  // Add all root domains your SaaS will run on so we can strip them correctly.
  'smartschool.com',
  'smartschool.ng',
  'smartschool.app',
  'vercel.app',
];

/**
 * Extracts the tenant subdomain from the current browser hostname.
 *
 * @returns {string | null}  e.g. "greensprings", or null if no subdomain found.
 */
export function extractSubdomain() {
  const hostname = window.location.hostname;

  // ── localhost / raw IP — no subdomain possible ──────────────────────────
  if (hostname === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
    return null;
  }

  const parts = hostname.split('.');

  // Must have at least 3 parts: sub.domain.tld
  if (parts.length < 3) return null;

  const sub = parts[0];

  // Reject generic non-tenant subdomains
  if (['www', 'api', 'app', 'mail', 'static', 'cdn'].includes(sub)) return null;

  return sub;
}

/**
 * Returns the most authoritative tenant identifier available for the current
 * browser context. This value is sent as the `X-Tenant-ID` header on every
 * Axios request.
 *
 * @returns {string}  A subdomain slug OR a cuid `tenantId` from localStorage.
 */
export function getCurrentTenant() {
  // 1. Developer Console Override (Highest priority for testing on generic domains)
  //    localStorage.setItem('__dev_tenant__', 'my-school')
  const devOverride = localStorage.getItem('__dev_tenant__');
  if (devOverride) return devOverride;

  // 2. Try subdomain next (production primary path)
  const subdomain = extractSubdomain();
  if (subdomain) return subdomain;

  // 2. Post-login: the server returns the authoritative cuid tenantId in the
  //    login response. AuthContext persists it as `tenantId` in localStorage.
  //    This is the fallback for flat IPs, bare domains, and dev environments.
  const storedTenantId = localStorage.getItem('tenantId');
  if (storedTenantId) return storedTenantId;

  // 3. Dev environment override via .env.local
  //    Set VITE_DEV_TENANT=<your-dev-school-slug> in frontend/.env.local
  const envTenant = import.meta.env.VITE_DEV_TENANT;
  if (envTenant) return envTenant;

  // 4. Per-developer override settable from browser console:
  //    localStorage.setItem('__dev_tenant__', 'my-school')
  const devOverride = localStorage.getItem('__dev_tenant__');
  if (devOverride) return devOverride;

  // 5. Safe fallback — prevents requests going out with no tenant context
  return 'demo';
}

/**
 * Persist the authoritative tenant cuid returned by the server after login.
 * Called by AuthContext immediately after a successful login response.
 *
 * @param {string} tenantId  The cuid string from the login response body.
 */
export function persistTenantId(tenantId) {
  if (tenantId) {
    localStorage.setItem('tenantId', tenantId);
  }
}

/**
 * Clear the persisted tenant on logout so stale data can't bleed into the
 * next session.
 */
export function clearTenantId() {
  localStorage.removeItem('tenantId');
}
