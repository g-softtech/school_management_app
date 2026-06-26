const prisma = require('../config/prisma');
const ApiError = require('../utils/ApiError');

/**
 * [AUTHENTICATED ROUTE]
 * Saves all builder fields under the active administrator's `req.tenantId`.
 * This acts as an upsert (creates if it doesn't exist, updates if it does).
 */
exports.updateWebsiteConfig = async (req, res, next) => {
  try {
    const tenantId = req.tenantId; // Injected by tenantContext middleware
    if (!tenantId) {
      throw new ApiError(400, 'Tenant context is missing.');
    }

    const {
      customDomain,
      primaryColor,
      secondaryColor,
      logoUrl,
      heroTitle,
      heroSubtitle,
      aboutText,
      contactEmail,
      contactPhone,
      address,
      gallery,
      activities,
      testimonials,
      admissionSteps
    } = req.body;

    if (!customDomain) {
      throw new ApiError(400, 'Custom domain is required.');
    }

    // Ensure the custom domain isn't taken by a different tenant
    const existing = await prisma.schoolWebsite.findUnique({
      where: { customDomain }
    });

    if (existing && existing.tenantId !== tenantId) {
      throw new ApiError(409, 'This custom domain is already registered to another school.');
    }

    // Transaction to safely update both Tenant (for core routing) and SchoolWebsite
    const result = await prisma.$transaction(async (tx) => {
      // 1. Upsert the SchoolWebsite config
      const website = await tx.schoolWebsite.upsert({
        where: { tenantId },
        update: {
          customDomain,
          primaryColor,
          secondaryColor,
          logoUrl,
          heroTitle,
          heroSubtitle,
          aboutText,
          contactEmail,
          contactPhone,
          address,
          gallery: gallery || [],
          activities: activities || null,
          testimonials: testimonials || null,
          admissionSteps: admissionSteps || null
        },
        create: {
          tenantId,
          customDomain,
          primaryColor: primaryColor || '#000000',
          secondaryColor: secondaryColor || '#ffffff',
          logoUrl,
          heroTitle,
          heroSubtitle,
          aboutText,
          contactEmail,
          contactPhone,
          address,
          gallery: gallery || [],
          activities: activities || null,
          testimonials: testimonials || null,
          admissionSteps: admissionSteps || null
        }
      });

      // 2. Synchronize the `customDomain` column in the Tenant table itself
      // (because our backend routing engine still needs it there)
      await tx.tenant.update({
        where: { id: tenantId },
        data: { customDomain }
      });

      return website;
    });

    res.json({
      success: true,
      message: 'Website configuration saved successfully.',
      data: result
    });

  } catch (error) {
    next(error);
  }
};

/**
 * [UNAUTHENTICATED ROUTE]
 * Parses `req.headers.host`, queries the database for the matching custom domain,
 * and returns the styling and section properties completely unauthenticated.
 */
exports.getPublicWebsiteConfig = async (req, res, next) => {
  try {
    // Extract the raw host, stripping any port numbers (e.g. localhost:5173 -> localhost)
    const host = (req.headers.host || '').split(':')[0];
    
    if (!host) {
      throw new ApiError(400, 'Missing Host header.');
    }

    const website = await prisma.schoolWebsite.findUnique({
      where: { customDomain: host }
    });

    if (!website) {
      throw new ApiError(404, `No public website configured for domain: ${host}`);
    }

    res.json({
      success: true,
      data: website
    });

  } catch (error) {
    next(error);
  }
};
