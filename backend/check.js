const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    include: { _count: { select: { users: true } } }
  });
  console.log(JSON.stringify(tenants, null, 2));
}

main().finally(() => prisma.$disconnect());
