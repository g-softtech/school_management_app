require('dotenv').config();
process.env.MOCK_REDIS = 'true';
const mongoose = require('mongoose');
const Class = require('./src/models/Class');
const Student = require('./src/models/Student');
const FeeStructure = require('./src/models/FeeStructure');
const StudentBill = require('./src/models/StudentBill');
const { generateBills } = require('./src/modules/studentBill/studentBill.controller');

async function setupTestData() {
  const testClass = await Class.create({ 
    name: 'Mongo Failover Test Class', 
    classTeacher: new mongoose.Types.ObjectId(),
    academicYear: '2025/2026'
  });
  
  const student1 = await Student.create({
    firstName: 'Mark',
    lastName: 'Smith',
    admissionNumber: 'TEST-MONGO-1',
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

function mockRes() {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.data = data; return res; };
  return res;
}

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  // Cleanup
  await Class.deleteMany({ name: 'Mongo Failover Test Class' });
  await Student.deleteMany({ admissionNumber: 'TEST-MONGO-1' });

  const { classId } = await setupTestData();

  console.log('\n--- Test 10: MongoDB Transaction Failover Behavior ---');
  
  // 1. Mock Mongo BulkWrite Interruption
  const originalBulkWrite = StudentBill.bulkWrite;
  StudentBill.bulkWrite = async function() {
    throw new Error('MongoNetworkError: connection 4 to 127.0.0.1:27017 closed');
  };

  console.log('[Simulating] MongoDB connection dropped during bulkWrite commit.');
  const req1 = { body: { classId, session: '2025/2026', term: 'first', forceRegenerate: true }, user: { _id: new mongoose.Types.ObjectId() } };
  const res1 = mockRes();
  
  try {
    await generateBills(req1, res1);
    console.log('Response with Mongo down:', res1.statusCode, res1.data.message);
    if (res1.statusCode === 500) {
      console.log('[PASS] API safely caught Mongo Network Error and aborted transaction.');
    } else {
      console.error('[FAIL] API did not return 500 on Mongo failure. Returned:', res1.statusCode);
    }
  } catch (err) {
    console.log('[PASS] API safely rejected request via caught exception:', err.message);
  }

  // Verify no partial records
  const partialBills = await StudentBill.countDocuments({ classId, session: '2025/2026', term: 'first' });
  if (partialBills === 0) {
    console.log('[PASS] No partial bills committed during aborted transaction.');
  } else {
    console.error(`[FAIL] Found ${partialBills} partial bills after aborted transaction!`);
  }

  // 2. Restore Mongo BulkWrite
  console.log('\n[Simulating] MongoDB connection restored.');
  StudentBill.bulkWrite = originalBulkWrite;

  const req2 = { body: { classId, session: '2025/2026', term: 'first', forceRegenerate: true }, user: { _id: new mongoose.Types.ObjectId() } };
  const res2 = mockRes();
  
  await generateBills(req2, res2);
  console.log('Response with Mongo up:', res2.statusCode, res2.data.message || res2.data.summary);
  
  if (res2.statusCode === 201) {
    console.log('[PASS] Generation succeeded fully after Mongo recovery.');
  } else {
    console.error('[FAIL] Generation failed after recovery.');
  }

  const finalBills = await StudentBill.countDocuments({ classId, session: '2025/2026', term: 'first' });
  if (finalBills === 1) {
    console.log('[PASS] Idempotency preserved! Exactly 1 bill created after recovery.');
  } else {
    console.error(`[FAIL] Expected 1 bill, found ${finalBills} bills after recovery!`);
  }

  // Cleanup
  await Class.deleteMany({ name: 'Mongo Failover Test Class' });
  await Student.deleteMany({ admissionNumber: 'TEST-MONGO-1' });
  await StudentBill.deleteMany({ classId });
  mongoose.disconnect();
  process.exit(0);
}

runTests().catch(console.error);
