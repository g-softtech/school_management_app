const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  const tenants = await prisma.tenant.findMany({
    where: { domain: { in: ['greensprings', 'rival-school'] } }
  });
  const tenantIds = tenants.map(t => t.id);

  await prisma.user.deleteMany({ where: { tenantId: { in: tenantIds } } });
  await prisma.schoolSetting.deleteMany({ where: { tenantId: { in: tenantIds } } });
  
  await prisma.tenant.deleteMany({
    where: { id: { in: tenantIds } }
  });
  console.log("Cleaned up old test tenants!");
}

clean().finally(() => prisma.$disconnect());
