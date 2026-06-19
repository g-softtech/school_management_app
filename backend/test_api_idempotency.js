require('dotenv').config();
process.env.MOCK_REDIS = 'true';
const mongoose = require('mongoose');
const Class = require('./src/models/Class');
const Student = require('./src/models/Student');
const FeeStructure = require('./src/models/FeeStructure');
const StudentBill = require('./src/models/StudentBill');
const { generateBills } = require('./src/modules/studentBill/studentBill.controller');
const { getRedisClient } = require('./src/config/redis');

async function setupTestData() {
  const testClass = await Class.create({ 
    name: 'Idempotency Test Class', 
    classTeacher: new mongoose.Types.ObjectId(),
    academicYear: '2025/2026'
  });
  
  const student1 = await Student.create({
    firstName: 'John',
    lastName: 'Doe',
    admissionNumber: 'TEST-1001',
    userId: new mongoose.Types.ObjectId(),
    classId: testClass._id,
    isActive: true,
    gender: 'male',
    dateOfBirth: new Date()
  });

  await FeeStructure.create({
    name: 'Tuition Fee',
    feeType: 'tuition',
    amount: 50000,
    session: '2025/2026',
    term: 'first',
    scope: 'specific_class',
    classId: testClass._id,
    isActive: true
  });

  return { classId: testClass._id, studentId: student1._id };
}

async function cleanupTestData(classId) {
  await Student.deleteMany({ classId });
  await FeeStructure.deleteMany({ classId });
  await StudentBill.deleteMany({ classId });
  await Class.deleteOne({ _id: classId });
}

function mockRes() {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.data = data; return res; };
  return res;
}

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');
  const redis = getRedisClient();

  // Cleanup from previous failed runs
  await Class.deleteMany({ name: 'Idempotency Test Class' });
  await Student.deleteMany({ admissionNumber: 'TEST-1001' });
  await FeeStructure.deleteMany({ name: 'Tuition Fee' });

  const { classId } = await setupTestData();
  
  // Test 1: Concurrency Validation
  console.log('\n--- Test 1: Concurrency Validation ---');
  const req1 = { body: { classId, session: '2025/2026', term: 'first' }, user: { _id: new mongoose.Types.ObjectId() } };
  const req2 = { body: { classId, session: '2025/2026', term: 'first' }, user: { _id: new mongoose.Types.ObjectId() } };
  
  const res1 = mockRes();
  const res2 = mockRes();
  
  const results = await Promise.all([
    generateBills(req1, res1),
    generateBills(req2, res2)
  ]);
  
  console.log('Response 1:', res1.statusCode, res1.data.message || res1.data.summary);
  console.log('Response 2:', res2.statusCode, res2.data.message || res2.data.summary);
  
  if ((res1.statusCode === 201 && res2.statusCode === 409) || (res1.statusCode === 409 && res2.statusCode === 201)) {
    console.log('[PASS] Concurrency lock successful. One succeeded, one blocked with 409 Conflict.');
  } else {
    console.error('[FAIL] Concurrency lock failed.');
  }

  // Test 3: Retry / Idempotency Validation
  console.log('\n--- Test 3: Retry Validation ---');
  await redis.del(`bill:generate:${classId}:2025/2026:first`); // Ensure lock is clear from Test 1
  
  const retryRes = mockRes();
  await generateBills(req1, retryRes);
  console.log('Retry Response:', retryRes.statusCode, retryRes.data.message);
  
  if (retryRes.statusCode === 400 && retryRes.data.message.includes('already generated')) {
    console.log('[PASS] Retry successfully rejected by API Soft Guard.');
  } else {
    console.error('[FAIL] Retry failed to reject.');
  }

  const billCount = await StudentBill.countDocuments({ classId, session: '2025/2026', term: 'first' });
  if (billCount === 1) {
    console.log('[PASS] Exactly one bill created in database.');
  } else {
    console.error(`[FAIL] Expected 1 bill, found ${billCount}.`);
  }

  // Test 2: Crash Simulation
  console.log('\n--- Test 2: Crash & Lock Lifecycle Simulation ---');
  const crashReq = { body: { classId, session: 'CRASH_TEST', term: 'first' }, user: { _id: new mongoose.Types.ObjectId() } };
  const crashRes = mockRes();
  
  // We will temporarily monkeypatch StudentBill.countDocuments to throw for CRASH_TEST
  const originalCount = StudentBill.countDocuments;
  StudentBill.countDocuments = function(query) {
    if (query.session === 'CRASH_TEST') throw new Error('TEST_CRASH');
    return originalCount.apply(this, arguments);
  };
  
  await generateBills(crashReq, crashRes);
  console.log('Crash Response:', crashRes.statusCode, crashRes.data.message);
  
  const lockExists = await redis.exists(`bill:generate:${classId}:CRASH_TEST:first`);
  if (lockExists === 0) {
    console.log('[PASS] Lock was cleanly removed in finally block after crash.');
  } else {
    console.error('[FAIL] Lock remained after crash!');
  }
  
  StudentBill.countDocuments = originalCount;

  await cleanupTestData(classId);
  mongoose.disconnect();
  process.exit(0);
}

runTests().catch(console.error);
