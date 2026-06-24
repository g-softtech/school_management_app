// Lives at: backend/src/middleware/tenantContext.js
//
// Intercepts every incoming request, resolves the tenant from either:
//   1. The X-Tenant-ID header  (primary — set by the React frontend using subdomain parsing)
//   2. The Host subdomain      (fallback — for direct API calls or testing)
//
// On success  → req.tenantId is populated and next() is called.
// On failure  → a clean JSON error is returned and the request is blocked.

const prisma    = require('../config/prisma');
const ApiError  = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');

// ─── Helper: extract a subdomain string from the Host header ─────────────────
// e.g. "greenfield.smartschool.com" → "greenfield"
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
  // 1. Read tenant identifier — header takes priority, subdomain is the fallback
  const headerTenantId = req.headers['x-tenant-id'];
  const subdomain      = extractSubdomain(req.hostname || (req.headers.host || '').split(':')[0]);

  const identifier = headerTenantId || subdomain;

  if (!identifier) {
    return next(
      new ApiError(
        400,
        'Missing tenant context. Ensure the X-Tenant-ID header is present or access the API via a valid subdomain.'
      )
    );
  }

  // 2. Validate the identifier against our PostgreSQL Tenant table.
  //    We match on EITHER the cuid-based `id` OR the human-readable `domain`
  //    so that both formats work cleanly without a second round-trip.
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [
        { id:     identifier },
        { domain: identifier },
      ],
      // Prevent deactivated / archived tenants from accessing the system
      // (add an `isActive` flag to the Tenant model in Phase 3 when needed)
    },
    select: { id: true, name: true },   // only fetch what we need — keep it lean
  });

  // 3. Guard — tenant not found → block with a clear 404
  if (!tenant) {
    return next(
      new ApiError(
        404,
        `School not found. No tenant matched the identifier: "${identifier}". Please check your X-Tenant-ID header.`
      )
    );
  }

  // 4. Inject resolved tenant ID onto the request object for all downstream
  //    controllers and middleware to consume safely.
  req.tenantId   = tenant.id;
  req.tenantName = tenant.name;   // convenience — useful for audit logs / emails

  next();
});

module.exports = tenantContext;
