const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const PLAN_FEATURES = {
  BASIC: [
    'feature_attendance', 
    'feature_assignments', 
    'feature_lesson_notes'
  ],
  PREMIUM: [
    'feature_attendance', 
    'feature_assignments', 
    'feature_lesson_notes',
    'feature_finance',
    'feature_invoices',
    'feature_notifications'
  ],
  ENTERPRISE: [
    'feature_attendance', 
    'feature_assignments', 
    'feature_lesson_notes',
    'feature_finance',
    'feature_invoices',
    'feature_notifications',
    'feature_webhooks',
    'feature_audit_logs'
  ]
};
const ALL_FEATURES = Array.from(new Set(Object.values(PLAN_FEATURES).flat()));

// Platform Owner Login
exports.loginPlatformOwner = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const platformUser = await prisma.platformUser.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!platformUser || !platformUser.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account' });
    }

    const isMatch = await bcrypt.compare(password, platformUser.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Sign JWT with special role
    const token = jwt.sign(
      { id: platformUser.id, role: 'PLATFORM_OWNER' },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '1d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: platformUser.id,
        name: platformUser.name,
        email: platformUser.email,
        role: 'PLATFORM_OWNER'
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all tenant requests
exports.getTenantRequests = async (req, res, next) => {
  try {
    const requests = await prisma.tenantRequest.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

// Approve a tenant request
exports.approveTenantRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;

    const request = await prisma.tenantRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}` });
    }

    // Verify subdomain is still not taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { domain: request.subdomain }
    });

    if (existingTenant) {
      return res.status(409).json({ success: false, message: 'Subdomain is now taken by another active school' });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the isolated Tenant container
      const tenant = await tx.tenant.create({
        data: {
          name: request.schoolName,
          domain: request.subdomain
        }
      });

      // 2. Generate and bulk-insert SchoolSettings feature flags
      const activeFeatures = PLAN_FEATURES[request.planType] || PLAN_FEATURES['BASIC'];
      const settingsData = ALL_FEATURES.map(featureKey => {
        const isEnabled = activeFeatures.includes(featureKey);
        return {
          tenantId: tenant.id,
          key: featureKey,
          value: String(isEnabled),
          description: `Toggles access to the ${featureKey} module`
        };
      });

      await tx.schoolSetting.createMany({ data: settingsData });

      // 3. Seed the primary Super Admin account directly into the new Tenant using the saved passwordHash
      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: request.adminName,
          email: request.adminEmail,
          password: request.passwordHash,
          role: 'SUPER_ADMIN',
          isActive: true
        }
      });

      // 4. Update the TenantRequest status
      const updatedRequest = await tx.tenantRequest.update({
        where: { id: request.id },
        data: { status: 'approved' }
      });

      return { tenant, adminUser, updatedRequest };
    });

    // In a real app, send email here!
    console.log(`[EMAIL SIMULATION] Sending welcome email to ${result.adminUser.email}...`);
    console.log(`[EMAIL SIMULATION] Subdomain: ${result.tenant.domain}`);

    res.json({
      success: true,
      message: 'Tenant approved, provisioned, and welcome email dispatched successfully.',
      data: result.tenant
    });

  } catch (error) {
    next(error);
  }
};

// Reject a tenant request
exports.rejectTenantRequest = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    
    const request = await prisma.tenantRequest.findUnique({
      where: { id: requestId }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}` });
    }

    await prisma.tenantRequest.update({
      where: { id: requestId },
      data: { status: 'rejected' }
    });

    res.json({ success: true, message: 'Tenant request rejected' });
  } catch (error) {
    next(error);
  }
};

// Get Global Analytics
exports.getPlatformAnalytics = async (req, res, next) => {
  try {
    const totalSchools = await prisma.tenant.count();
    const totalPendingRequests = await prisma.tenantRequest.count({ where: { status: 'pending' } });
    const totalUsers = await prisma.user.count();

    res.json({
      success: true,
      data: {
        totalSchools,
        totalPendingRequests,
        totalUsers,
        mrr: totalSchools * 49.99 // Mock MRR calculation
      }
    });
  } catch (error) {
    next(error);
  }
};
