const { PrismaClient } = require('@prisma/client');
const app = require('./app');
const http = require('http');

const prisma = new PrismaClient();

async function runTest() {
  console.log('🔄 Starting Integration Test Server...');
  const server = http.createServer(app);
  
  await new Promise(resolve => server.listen(9999, resolve));
  console.log('✅ Test server listening on http://localhost:9999\n');

  try {
    // === 1. PRE-CLEANUP ===
    console.log('🧹 Cleaning up old test data...');
    const oldTenant = await prisma.tenant.findUnique({ where: { domain: 'greensprings' } });
    if (oldTenant) {
      await prisma.schoolSetting.deleteMany({ where: { tenantId: oldTenant.id } });
      await prisma.user.deleteMany({ where: { tenantId: oldTenant.id } });
      await prisma.tenant.delete({ where: { id: oldTenant.id } });
    }

    // === 2. TENANT PROVISIONING VALIDATION ===
    console.log('\n🚀 [TEST 1] Testing Tenant Provisioning...');
    const provRes = await fetch('http://localhost:9999/api/public/provision', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        schoolName: 'GreenSprings Academy',
        subdomain: 'greensprings',
        adminName: 'Super Admin',
        adminEmail: 'admin@greensprings.com',
        adminPassword: 'password123',
        planType: 'BASIC' // BASIC should give attendance, assignments, lesson notes. No finance.
      })
    });
    
    const provData = await provRes.json();
    if (!provRes.ok) throw new Error('Provisioning failed: ' + JSON.stringify(provData));
    console.log('   ✅ Provisioning Success! Response:', JSON.stringify(provData));

    // Verify settings directly in DB using the actual cuid generated for the tenant
    const actualTenantId = provData.data.tenantId;
    const settings = await prisma.schoolSetting.findMany({ where: { tenantId: actualTenantId } });
    console.log('   ✅ Seeded Feature Flags:');
    settings.forEach(s => console.log(`      - ${s.key}: ${s.value}`));

    // Check if finance is enabled (it shouldn't be)
    const financeFlag = settings.find(s => s.key === 'feature_finance');
    if (!financeFlag || financeFlag.value !== 'true') {
      console.log('   ✅ Security Confirmed: feature_finance is correctly disabled for BASIC plan.');
    } else {
      throw new Error('Finance flag should not be true for BASIC plan!');
    }

    // === 3. AUTHENTICATE ===
    console.log('\n🔑 [TEST 2] Authenticating as GreenSprings Admin...');
    const loginRes = await fetch('http://localhost:9999/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': 'greensprings' },
      body: JSON.stringify({ email: 'admin@greensprings.com', password: 'password123' })
    });
    const loginData = await loginRes.json();
    if (!loginRes.ok) throw new Error('Login failed: ' + JSON.stringify(loginData));
    const token = loginData.token;
    console.log('   ✅ Successfully Authenticated! Token acquired.');

    // === 4. FEATURE FLAG INTERCEPTION TEST ===
    console.log('\n🛡️ [TEST 3] Testing Feature Flag Middleware Interception...');
    
    // 4A: Attendance (Should pass because it's a BASIC feature)
    const attRes = await fetch('http://localhost:9999/api/attendance', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-ID': 'greensprings' }
    });
    console.log(`   🟢 Attendance Request Status: ${attRes.status} (Expected: 200 or 404/Empty DB but NOT 403)`);
    if (attRes.status === 403) throw new Error('Attendance should not be blocked on BASIC plan.');

    // 4B: Finance (Should be blocked)
    const finRes = await fetch('http://localhost:9999/api/fee-structures', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-ID': 'greensprings' }
    });
    const finData = await finRes.json();
    console.log(`   🔴 Finance Request Status: ${finRes.status} (Expected: 403)`);
    console.log(`   🔴 Rejection Message: "${finData.message || finData.error}"`);
    if (finRes.status !== 403) throw new Error('Finance MUST be blocked on BASIC plan!');
    console.log('   ✅ FeatureGuard Middleware correctly intercepted and rejected unauthorized module access.');

    // === 5. CROSS-TENANT ISOLATION BREACH TEST ===
    console.log('\n🚨 [TEST 4] Simulating Cross-Tenant Breach Attack...');
    
    // Create a dummy 'rival-school'
    await prisma.tenant.upsert({
      where: { domain: 'rival-school' },
      create: { domain: 'rival-school', name: 'Rival Academy' },
      update: {}
    });

    // The token belongs to user in 'greensprings'. If we forge X-Tenant-ID to 'rival-school', 
    // the auth middleware or tenant scope should detect a mismatch and block it.
    const breachRes = await fetch('http://localhost:9999/api/assignments', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-ID': 'rival-school' }
    });
    
    const breachData = await breachRes.json();
    console.log(`   ❌ Breach Attempt Status: ${breachRes.status}`);
    console.log(`   ❌ Breach Response:`, breachData);
    
    if (breachRes.status === 200) {
      // If it returned 200, it means it leaked data or at least allowed access to another tenant's query space.
      throw new Error('CRITICAL FAILURE: Cross-tenant breach succeeded! User accessed another tenant.');
    }
    
    console.log('   ✅ Isolation Confirmed! The system strictly isolated the data context and blocked the mismatch.');

    console.log('\n🏆 ALL MULTI-TENANT ISOLATION TESTS PASSED FLAWLESSLY!');

  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err.message);
    process.exit(1);
  } finally {
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  }
}

runTest();
