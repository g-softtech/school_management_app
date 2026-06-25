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

exports.provisionTenant = async (req, res, next) => {
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

    // Clean and lowercase subdomain to prevent routing mismatches and inject attacks
    const cleanSubdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

    // Preemptive check to ensure the subdomain is not already taken
    const existingTenant = await prisma.tenant.findUnique({
      where: { domain: cleanSubdomain }
    });

    if (existingTenant) {
      return res.status(409).json({ 
        success: false, 
        message: `The subdomain '${cleanSubdomain}' is already registered.` 
      });
    }

    // Atomically create Tenant, Settings, and Super Admin via Transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the isolated Tenant container
      const tenant = await tx.tenant.create({
        data: {
          name: schoolName,
          domain: cleanSubdomain
        }
      });

      // 2. Generate and bulk-insert SchoolSettings feature flags based on planType
      const activeFeatures = PLAN_FEATURES[planType];
      const settingsData = ALL_FEATURES.map(featureKey => {
        const isEnabled = activeFeatures.includes(featureKey);
        return {
          tenantId: tenant.id,
          key: featureKey,
          value: String(isEnabled),
          description: `Toggles access to the ${featureKey} module`
        };
      });

      await tx.schoolSetting.createMany({
        data: settingsData
      });

      // Hash password securely
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(adminPassword, salt);

      // 3. Seed the primary Super Admin account directly into the new Tenant
      const adminUser = await tx.user.create({
        data: {
          tenantId: tenant.id,
          name: adminName,
          email: adminEmail.trim().toLowerCase(),
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          isActive: true
        }
      });

      return { tenant, adminUser };
    });

    return res.status(201).json({
      success: true,
      message: 'Tenant provisioned and isolated successfully with dynamic feature modules.',
      data: {
        tenantId: result.tenant.id,
        schoolName: result.tenant.name,
        subdomain: result.tenant.domain,
        adminEmail: result.adminUser.email
      }
    });

  } catch (error) {
    console.error('[PROVISION ERROR]', error);
    next(error);
  }
};
