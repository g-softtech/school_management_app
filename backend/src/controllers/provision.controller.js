const bcrypt = require('bcryptjs');
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

exports.registerTenantRequest = async (req, res, next) => {
  try {
    const { schoolName, subdomain, adminName, adminEmail, adminPassword, planType = 'BASIC' } = req.body;

    if (!schoolName || !subdomain || !adminName || !adminEmail || !adminPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields (schoolName, subdomain, adminName, adminEmail, adminPassword) are required.' 
      });
    }

    if (!PLAN_FEATURES[planType]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid planType specified. Must be BASIC, PREMIUM, or ENTERPRISE.'
      });
    }

    const cleanSubdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

    // Check if subdomain is taken in ACTIVE tenants
    const existingTenant = await prisma.tenant.findUnique({
      where: { domain: cleanSubdomain }
    });
    if (existingTenant) {
      return res.status(409).json({ 
        success: false, 
        message: `The subdomain '${cleanSubdomain}' is already taken by an active school.` 
      });
    }

    // Check if there's already a pending request for this subdomain or email
    const existingRequest = await prisma.tenantRequest.findFirst({
      where: {
        OR: [
          { subdomain: cleanSubdomain },
          { adminEmail: adminEmail.trim().toLowerCase() }
        ],
        status: 'pending'
      }
    });

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: 'A pending registration already exists for this subdomain or email address.'
      });
    }

    // Hash the password now so we don't store plain text in the staging table
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    const tenantRequest = await prisma.tenantRequest.create({
      data: {
        schoolName,
        subdomain: cleanSubdomain,
        adminName,
        adminEmail: adminEmail.trim().toLowerCase(),
        passwordHash: hashedPassword, // Note: We need to add passwordHash to schema!
        planType
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Registration received successfully. Your school is pending approval from the platform administrator.',
      data: {
        requestId: tenantRequest.id,
        status: tenantRequest.status
      }
    });

  } catch (error) {
    console.error('[PROVISION ERROR]', error);
    next(error);
  }
};
