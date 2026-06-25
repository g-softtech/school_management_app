const prisma = require('../config/prisma');

const checkFeature = (featureKey) => {
  return async (req, res, next) => {
    try {
      const tenantId = req.tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Missing tenant context." });
      }

      // Interrogate the SchoolSetting model via Prisma singleton
      const setting = await prisma.schoolSetting.findUnique({
        where: {
          tenantId_key: {
            tenantId,
            key: featureKey
          }
        }
      });

      // If no record exists or value evaluates to anything other than "true"
      if (!setting || setting.value !== "true") {
        return res.status(403).json({ 
          error: "This module is not activated for your school's subscription plan." 
        });
      }

      // Validated. Hand off control
      next();
    } catch (error) {
      console.error(`[FEATURE GUARD ERROR] Failed to verify feature ${featureKey}:`, error);
      res.status(500).json({ error: "Internal server error during feature verification." });
    }
  };
};

module.exports = { checkFeature };
