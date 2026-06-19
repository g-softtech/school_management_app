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
    name: 'Redis Failover Test Class', 
    classTeacher: new mongoose.Types.ObjectId(),
    academicYear: '2025/2026'
  });
  
  const student1 = await Student.create({
    firstName: 'Jane',
    lastName: 'Doe',
    admissionNumber: 'TEST-REDIS-1',
    userId: new mongoose.Types.ObjectId(),
    classId: testClass._id,
    isActive: true,
    gender: 'female',
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

  // Cleanup
  await Class.deleteMany({ name: 'Redis Failover Test Class' });
  await Student.deleteMany({ admissionNumber: 'TEST-REDIS-1' });

  const { classId } = await setupTestData();

  console.log('\n--- Test 9: Redis Failure / Recovery Behavior ---');
  
  // 1. Mock Redis Down
  const originalSet = redis.set;
  redis.set = async function() {
    throw new Error('Redis connection lost');
  };

  console.log('[Simulating] Redis connection dropped.');
  const req1 = { body: { classId, session: '2025/2026', term: 'first' }, user: { _id: new mongoose.Types.ObjectId() } };
  const res1 = mockRes();
  
  try {
    await generateBills(req1, res1);
    console.log('Response with Redis down:', res1.statusCode, res1.data.message);
    if (res1.statusCode === 500) {
      console.log('[PASS] API safely rejected request during Redis outage instead of bypassing locks.');
    } else {
      console.error('[FAIL] API did not return 500 on Redis failure. Returned:', res1.statusCode);
    }
  } catch (err) {
    console.log('[PASS] API safely rejected request via caught exception:', err.message);
  }

  // 2. Restore Redis
  console.log('\n[Simulating] Redis connection restored.');
  redis.set = originalSet;

  const req2 = { body: { classId, session: '2025/2026', term: 'first' }, user: { _id: new mongoose.Types.ObjectId() } };
  const res2 = mockRes();
  
  await generateBills(req2, res2);
  console.log('Response with Redis up:', res2.statusCode, res2.data.message || res2.data.summary);
  
  if (res2.statusCode === 201) {
    console.log('[PASS] Generation succeeded after Redis recovery.');
  } else {
    console.error('[FAIL] Generation failed after recovery.');
  }

  const lockExists = await redis.exists(`bill:generate:${classId}:2025/2026:first`);
  if (lockExists === 0) {
    console.log('[PASS] Lock state is correctly cleaned up after successful recovery.');
  } else {
    console.error('[FAIL] Lock state was not cleaned up after recovery.');
  }

  // Cleanup
  await Class.deleteMany({ name: 'Redis Failover Test Class' });
  await Student.deleteMany({ admissionNumber: 'TEST-REDIS-1' });
  await StudentBill.deleteMany({ classId });
  mongoose.disconnect();
  process.exit(0);
}

runTests().catch(console.error);
