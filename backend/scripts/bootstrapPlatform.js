const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function bootstrap() {
  console.log('\n=============================================');
  console.log('🚀 PLATFORM CONTROL PLANE BOOTSTRAPPER 🚀');
  console.log('=============================================\n');

  try {
    const name = await question('Enter Platform Owner Name: ');
    const email = await question('Enter Platform Owner Email: ');
    const password = await question('Enter Master Password: ');

    if (!name || !email || !password) {
      console.error('\n❌ All fields are required. Bootstrapping aborted.\n');
      process.exit(1);
    }

    console.log(`\n🔍 Checking for existing platform user with email: ${email}...`);
    
    const existingUser = await prisma.platformUser.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (existingUser) {
      console.error(`\n❌ A Platform User with the email ${email} already exists.\n`);
      process.exit(1);
    }

    console.log('🔐 Hashing password...');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    console.log('🏗️  Creating primary Platform User account...');
    const newPlatformUser = await prisma.platformUser.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        isActive: true
      }
    });

    console.log('\n✅ ============================================');
    console.log('🎉 PLATFORM OWNER ACCOUNT CREATED SUCCESSFULLY!');
    console.log('============================================');
    console.log(`ID    : ${newPlatformUser.id}`);
    console.log(`Name  : ${newPlatformUser.name}`);
    console.log(`Email : ${newPlatformUser.email}`);
    console.log('============================================\n');

  } catch (error) {
    console.error('\n❌ Fatal Error during bootstrapping:', error);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

bootstrap();
