// Lives at: backend/src/modules/auth/auth.controller.js
//
// ─────────────────────────────────────────────────────────────────────────────
// Auth Controller — Multi-Tenant Prisma Edition
//
// Key architecture changes from the MongoDB version:
//
//  1. All user lookups now scope by `tenantId` via @@unique([tenantId, email]).
//  2. Because /api/auth/* routes are registered BEFORE the tenantContext gate
//     in app.js (users must log in to know their tenant), we resolve the tenant
//     inline using a shared helper `resolveTenant(req)`.
//  3. JWT payload now embeds `tenantId` so the authMiddleware can forward it
//     onto req.tenantId for every subsequent authenticated request.
//  4. Passwords are hashed with bcryptjs (no longer delegated to Mongoose hooks).
// ─────────────────────────────────────────────────────────────────────────────

const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const prisma   = require('../../config/prisma');
const ApiError = require('../../utils/ApiError');
const catchAsync = require('../../utils/catchAsync');
const {
  sendTokenResponse,
  verifyRefreshToken,
  generateAccessToken,
} = require('../../utils/generateToken');

const CLIENT_URL = process.env.CLIENT_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://smartschool-app.onrender.com'
    : 'http://localhost:5173');

// ─── Shared helper: resolve tenant from request ───────────────────────────────
// Auth routes sit BEFORE the tenantContext gate, so we resolve inline.
// Priority: req.tenantId (already resolved by gate) → X-Tenant-ID header → subdomain.
async function resolveTenant(req) {
  // 1. Already resolved upstream (non-auth protected routes that pass the gate)
  if (req.tenantId) {
    return { id: req.tenantId };
  }

  const headerId = req.headers['x-tenant-id'];
  const host     = req.hostname || (req.headers.host || '').split(':')[0];
  
  // 2. Try Header or Subdomain (Core SaaS Matrix)
  let subdomain = null;
  const parts = host.split('.');
  if (parts.length >= 3 && parts[0] !== 'www') subdomain = parts[0];

  const identifier = headerId || subdomain;
  if (identifier) {
    const tenant = await prisma.tenant.findFirst({
      where: {
        OR: [{ id: identifier }, { domain: identifier }],
      },
      select: { id: true, name: true },
    });
    if (tenant) return tenant;
  }

  // 3. Fallback: Custom Domain (White-label Route)
  if (host) {
    return prisma.tenant.findUnique({
      where: { customDomain: host },
      select: { id: true, name: true }
    });
  }

  return null;
}

// ─── REGISTER ────────────────────────────────────────────────────────────────
exports.register = catchAsync(async (req, res, next) => {
  const { name, email, password, role, phone, qualification } = req.body;

  if (!name || !email || !password) {
    return next(new ApiError(400, 'Please provide name, email and password'));
  }
  if (role === 'admin') {
    return next(new ApiError(403, 'Admin accounts cannot be created via this endpoint'));
  }

  // Resolve tenant from request
  const tenant = await resolveTenant(req);
  if (!tenant) {
    return next(new ApiError(400, 'Missing tenant context. Ensure the X-Tenant-ID header is present.'));
  }

  // Duplicate check — scoped to this tenant only
  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() } },
    select: { id: true },
  });
  if (existing) {
    return next(new ApiError(409, 'An account with this email already exists in this school'));
  }

  // Hash password (Mongoose pre-save hook no longer applies)
  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      tenantId:      tenant.id,
      name,
      email:         email.toLowerCase(),
      password:      hashedPassword,
      role:          role || 'student',
      phone:         phone         || null,
      qualification: qualification || null,
    },
    select: {
      id: true, name: true, email: true,
      role: true, tenantId: true, isActive: true,
    },
  });

  const tokens = sendTokenResponse(user, 201, res);

  // Persist refresh token
  await prisma.user.update({
    where: { id: user.id },
    data:  { refreshToken: tokens.refreshToken },
  });
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ApiError(400, 'Please provide email and password'));
  }

  // 1. Resolve tenant context from Host or X-Tenant-ID
  let tenant = await resolveTenant(req);
  let user = null;

  // 2. If NO tenant is provided (i.e., Centralized Login Portal)
  if (!tenant) {
    // Search across ALL schools for this email
    const users = await prisma.user.findMany({
      where: { email: email.toLowerCase() },
      include: { tenant: { select: { id: true, name: true } } }
    });

    if (users.length === 0) {
      // Dummy check to prevent timing attacks
      await bcrypt.compare(password, '$2b$12$invalidhashpadding000000000000000000000000000000000');
      return next(new ApiError(401, 'Incorrect email or password'));
    }

    if (users.length > 1) {
      // User exists in multiple schools! Return the selection array.
      return res.status(200).json({
        success: true,
        message: 'Multiple schools found. Please select your workspace.',
        action: 'SELECT_WORKSPACE',
        schools: users.map(u => ({ tenantId: u.tenant.id, name: u.tenant.name }))
      });
    }

    // Exactly 1 user found across the platform. Auto-select their tenant.
    user = users[0];
    tenant = user.tenant;
  } else {
    // 3. Tenant was provided (Custom Domain / Subdomain login)
    user = await prisma.user.findUnique({
      where: {
        tenantId_email: {
          tenantId: tenant.id,
          email:    email.toLowerCase(),
        },
      },
      include: { tenant: { select: { id: true, name: true } } }
    });
  }

  const passwordMatch = user
    ? await bcrypt.compare(password, user.password)
    : await bcrypt.compare(password, '$2b$12$invalidhashpadding000000000000000000000000000000000'); // dummy

  if (!user || !passwordMatch) {
    return next(new ApiError(401, 'Incorrect email or password'));
  }

  if (!user.isActive) {
    return next(new ApiError(401, 'Your account has been deactivated. Contact the school admin.'));
  }

  const tokens = sendTokenResponse(user, 200, res);

  // Persist refresh token + last login timestamp
  await prisma.user.update({
    where: { id: user.id },
    data:  { refreshToken: tokens.refreshToken, lastLogin: new Date() },
  });
});

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
exports.logout = catchAsync(async (req, res) => {
  await prisma.user.update({
    where: { id: req.user.id },
    data:  { refreshToken: null },
  });

  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
exports.refreshToken = catchAsync(async (req, res, next) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return next(new ApiError(401, 'No refresh token provided. Please log in again.'));
  }

  const decoded = verifyRefreshToken(token);

  // Fetch user by id + refreshToken — avoids a second DB round-trip for tenant lookup
  const user = await prisma.user.findFirst({
    where: { id: decoded.id, refreshToken: token },
    select: { id: true, name: true, email: true, role: true, tenantId: true, isActive: true },
  });

  if (!user) {
    return next(new ApiError(401, 'Invalid or expired refresh token.'));
  }

  res.status(200).json({ success: true, accessToken: generateAccessToken(user) });
});

// ─── GET ME ───────────────────────────────────────────────────────────────────
exports.getMe = catchAsync(async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

// ─── UPDATE PASSWORD ──────────────────────────────────────────────────────────
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new ApiError(400, 'Please provide currentPassword and newPassword'));
  }
  if (newPassword.length < 8) {
    return next(new ApiError(400, 'New password must be at least 8 characters'));
  }

  // Fetch with password field
  const user = await prisma.user.findUnique({
    where:  { id: req.user.id },
    select: { id: true, password: true, name: true, email: true, role: true, tenantId: true, isActive: true },
  });

  const match = await bcrypt.compare(currentPassword, user.password);
  if (!match) {
    return next(new ApiError(401, 'Current password is incorrect'));
  }

  const hashedNew = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data:  { password: hashedNew, refreshToken: null }, // invalidate existing sessions
  });

  const tokens = sendTokenResponse(user, 200, res);
  await prisma.user.update({
    where: { id: user.id },
    data:  { refreshToken: tokens.refreshToken },
  });
});

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  if (!email) return next(new ApiError(400, 'Please provide your email address'));

  const tenant = await resolveTenant(req);
  if (!tenant) {
    return next(new ApiError(400, 'Missing tenant context. Ensure the X-Tenant-ID header is present.'));
  }

  // Tenant-scoped lookup — prevents cross-school token generation
  const user = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: email.toLowerCase() } },
    select: { id: true },
  });

  // Always respond success to prevent email enumeration attacks
  if (!user) {
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  }

  const resetToken  = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const expiresAt   = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  await prisma.user.update({
    where: { id: user.id },
    data:  { passwordResetToken: hashedToken, passwordResetExpires: expiresAt },
  });

  const resetUrl = `${CLIENT_URL}/reset-password/${resetToken}`;

  if (process.env.NODE_ENV === 'production') {
    // TODO: fire nodemailer/Sendgrid here
    console.log('[ForgotPassword] Reset URL for', email, ':', resetUrl);
    return res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a reset link has been sent.',
    });
  }

  // Development: expose token for easy API testing
  res.status(200).json({
    success: true,
    message: 'Password reset link generated (dev mode — check response data).',
    resetUrl,
    resetToken,
  });
});

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
exports.resetPassword = catchAsync(async (req, res, next) => {
  const rawToken    = req.params.token;
  const newPassword = req.body.password;

  if (!newPassword || newPassword.length < 8) {
    return next(new ApiError(400, 'Password must be at least 8 characters'));
  }

  const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

  // Find user whose reset token is valid and not yet expired
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken:   hashedToken,
      passwordResetExpires: { gt: new Date() }, // Prisma date filter (not Mongoose $gt)
    },
    select: { id: true, name: true, email: true, role: true, tenantId: true, isActive: true },
  });

  if (!user) {
    return next(new ApiError(400, 'Reset link is invalid or has expired. Please request a new one.'));
  }

  const hashedNew = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password:             hashedNew,
      passwordResetToken:   null,
      passwordResetExpires: null,
    },
  });

  const tokens = sendTokenResponse(user, 200, res);
  await prisma.user.update({
    where: { id: user.id },
    data:  { refreshToken: tokens.refreshToken },
  });
});
