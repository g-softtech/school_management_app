// Lives at: backend/src/middleware/tenantContext.js
//
// Intercepts every incoming request, resolves the tenant from either:
//   1. The X-Tenant-ID header  (primary — set by the React frontend using subdomain parsing)
//   2. The Host subdomain      (fallback — for direct API calls or testing)
//   3. A Custom Domain         (White-Label dynamic route)
//
// On success  → req.tenantId is populated and next() is called.
// On failure  → a clean JSON error is returned and the request is blocked.

const prisma    = require('../config/prisma');
const ApiError  = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

// Core Platform Domains (Bypass Custom Domain logic)
const CORE_DOMAINS = ['thecortexsystems.com', 'www.thecortexsystems.com', 'localhost'];

// ─── Helper: extract a subdomain string from the Host header ─────────────────
// e.g. "greenfield.thecortexsystems.com" → "greenfield"
// Returns null if the host is localhost / bare domain / IP.
function extractSubdomain(host) {
  if (!host) return null;
  const parts = host.split('.');
  // A valid subdomain exists only when there are 3+ parts (sub.domain.tld)
  if (parts.length < 3) return null;
  const sub = parts[0];
  // Guard against raw IPs or "www" acting as a false tenant
  if (sub === 'www' || /^\d+$/.test(sub)) return null;
  return sub;
}

// ─── Main middleware ───────────────────────────────────────────────────────────
const tenantContext = catchAsync(async (req, res, next) => {
  // 1. Clean the host header by stripping the port (e.g. :5000, :5173)
  const rawHost = req.headers.host || '';
  const cleanHost = rawHost.split(':')[0].toLowerCase();

  let tenant = null;

  // 2. Condition 1 (Core Matrix): Standard SaaS routing
  // If the request comes via our core domain, we rely on X-Tenant-ID or Subdomain
  if (
    CORE_DOMAINS.includes(cleanHost) || 
    cleanHost.endsWith('.thecortexsystems.com') || 
    cleanHost.includes('onrender.com') || 
    cleanHost.includes('vercel.app')
  ) {
    
    const headerTenantId = req.headers['x-tenant-id'];
    const subdomain      = extractSubdomain(cleanHost);
    const identifier     = headerTenantId || subdomain;

    if (!identifier) {
      return next(
        new ApiError(
          400,
          'Missing tenant context. Ensure the X-Tenant-ID header is present or access the API via a valid subdomain.'
        )
      );
    }

    // Validate the identifier against the Tenant table
    tenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { id: identifier },
          { domain: identifier },
        ]
      },
      select: { id: true, name: true, customDomain: true }
    });

  } else {
    // 3. Condition 2 (White-Label Dynamic Route)
    // The request is hitting us from a custom third-party domain (e.g., greenspringsacademy.com)
    // We execute a targeted lookup directly against customDomain
    
    tenant = await prisma.tenant.findUnique({
      where: { customDomain: cleanHost },
      select: { id: true, name: true, customDomain: true }
    });
  }

  // 4. The Domain Vault: Guard — tenant not found → block with a clear 404
  if (!tenant) {
    return next(
      new ApiError(
        404,
        `School not found. The domain "${cleanHost}" is not mapped to an active school in our system.`
      )
    );
  }

  // 5. Inject resolved tenant ID onto the request object
  req.tenantId     = tenant.id;
  req.tenantName   = tenant.name;
  req.customDomain = tenant.customDomain;

  next();
});

module.exports = tenantContext;
