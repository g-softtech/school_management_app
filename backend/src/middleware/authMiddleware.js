// Lives at: backend/src/middleware/authMiddleware.js
//
// ─────────────────────────────────────────────────────────────────────────────
// Auth Middleware — Multi-Tenant Prisma Edition
//
// Changes from the MongoDB version:
//   • User.findById (Mongoose) → prisma.user.findUnique (Prisma)
//   • Stamps req.tenantId from the JWT payload — subsequent middleware and
//     controllers can rely on req.tenantId without a separate DB lookup.
//   • isAccountActive() instance method replaced with an inline boolean check.
// ─────────────────────────────────────────────────────────────────────────────

const prisma    = require('../config/prisma');
const ApiError  = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { verifyAccessToken } = require('../utils/generateToken');

const protect = catchAsync(async (req, res, next) => {
  // 1. Extract Bearer token from Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Access denied. No token provided. Please log in.'));
  }

  const token = authHeader.split(' ')[1];

  // 2. Verify signature — throws JsonWebTokenError / TokenExpiredError on failure
  const decoded = verifyAccessToken(token);

  // 3. Stamp req.tenantId from the token payload immediately.
  //    This means routes that run protect AFTER the tenantContext gate will have
  //    req.tenantId set twice (by gate and by JWT) — both values are identical
  //    as they originate from the same user row.
  if (decoded.tenantId) {
    req.tenantId = decoded.tenantId;
  }

  // 4. Re-validate user still exists and is active in PostgreSQL.
  //    We scope by id AND tenantId to guard against token replay attacks where
  //    a stolen token from tenant-A is used against tenant-B's API.
  const currentUser = await prisma.user.findFirst({
    where: {
      id:       decoded.id,
      tenantId: decoded.tenantId,   // ← tenant-scoped re-validation
      isActive: true,               // baked into query: active check + existence check in one
    },
    select: {
      id: true, name: true, email: true,
      role: true, tenantId: true, isActive: true,
    },
  });

  if (!currentUser) {
    // Covers: user deleted, deactivated, or tenantId mismatch
    return next(new ApiError(401, 'The user belonging to this token no longer exists or has been deactivated.'));
  }

  // 5. Attach user and tenantId to request for downstream use
  req.user     = currentUser;
  req.tenantId = currentUser.tenantId;  // always authoritative from DB

  next();
});

module.exports = protect;