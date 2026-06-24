// Lives at: backend/src/utils/generateToken.js
//
// ─────────────────────────────────────────────────────────────────────────────
// JWT Token Utilities — Multi-Tenant Edition
//
// Changes from the MongoDB version:
//   • user.id  replaces user._id  (Prisma returns `id`, Mongoose returned `_id`)
//   • tenantId is now embedded in the access token payload so authMiddleware
//     can forward it onto req.tenantId without an extra DB lookup per request.
//   • sendTokenResponse response body uses user.id consistently.
// ─────────────────────────────────────────────────────────────────────────────

const jwt = require('jsonwebtoken');

const JWT_SECRET           = process.env.JWT_SECRET;
const JWT_EXPIRES_IN       = process.env.JWT_EXPIRES_IN        || '7d';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const REFRESH_EXPIRES_IN   = process.env.REFRESH_EXPIRES_IN    || '30d';

// ─── Access token ─────────────────────────────────────────────────────────────
// Payload includes tenantId so authMiddleware can stamp req.tenantId without
// a round-trip to the database on every authenticated request.
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id:       user.id,        // Prisma: `id` (cuid string)
      role:     user.role,
      email:    user.email,
      tenantId: user.tenantId,  // ← multi-tenant addition
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

// ─── Refresh token ────────────────────────────────────────────────────────────
// Minimal payload — only `id` needed. The full user is re-fetched on use.
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    REFRESH_TOKEN_SECRET,
    { expiresIn: REFRESH_EXPIRES_IN }
  );
};

const verifyAccessToken  = (token) => jwt.verify(token, JWT_SECRET);
const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_TOKEN_SECRET);

// ─── Send token response ──────────────────────────────────────────────────────
// Sets the httpOnly refreshToken cookie and returns the access token + user
// object in the JSON body.
const sendTokenResponse = (user, statusCode, res) => {
  const accessToken  = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   30 * 24 * 60 * 60 * 1000, // 30 days in ms
  });

  res.status(statusCode).json({
    success: true,
    accessToken,
    user: {
      id:       user.id,       // Prisma `id` (cuid) — consistent with DB
      name:     user.name,
      email:    user.email,
      role:     user.role,
      tenantId: user.tenantId, // ← exposed so frontend can cache tenant context
    },
  });

  return { accessToken, refreshToken };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  sendTokenResponse,
};