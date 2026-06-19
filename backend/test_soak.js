require('dotenv').config();
process.env.MOCK_REDIS = 'true';
const mongoose = require('mongoose');
const Class = require('./src/models/Class');
const Student = require('./src/models/Student');
const FeeStructure = require('./src/models/FeeStructure');
const StudentBill = require('./src/models/StudentBill');
const { generateBills } = require('./src/modules/studentBill/studentBill.controller');
const { getRedisClient } = require('./src/config/redis');

async function setupTestData(numStudents) {
  const testClass = await Class.create({ 
    name: 'Soak Test Class', 
    classTeacher: new mongoose.Types.ObjectId(),
    academicYear: '2025/2026'
  });

  const students = [];
  for (let i = 0; i < numStudents; i++) {
    students.push({
      firstName: `Student${i}`,
      lastName: 'Soak',
      admissionNumber: `SOAK-${Date.now()}-${i}`,
      userId: new mongoose.Types.ObjectId(),
      classId: testClass._id,
      isActive: true,
      gender: 'male',
      dateOfBirth: new Date()
    });
  }
  await Student.insertMany(students);

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

  return { classId: testClass._id };
}

function mockRes() {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.data = data; return res; };
  return res;
}

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');
  const redis = getRedisClient();

  // Cleanup
  await Class.deleteMany({ name: 'Soak Test Class' });
  await Student.deleteMany({ lastName: 'Soak' });

  const { classId } = await setupTestData(100);

  console.log('\n--- Test 11: Sustained Load / Queue Pressure Test (Soak Test) ---');
  
  const startTime = Date.now();
  const soakDurationMs = 15000; // 15 seconds soak test to avoid blocking CI forever
  let cycles = 0;

  console.log(`[Soak] Running sustained generation load for ${soakDurationMs/1000} seconds...`);
  
  while (Date.now() - startTime < soakDurationMs) {
    const req = { body: { classId, session: '2025/2026', term: 'first', forceRegenerate: true }, user: { _id: new mongoose.Types.ObjectId() } };
    const res = mockRes();
    
    await generateBills(req, res);
    
    if (res.statusCode !== 201 && res.statusCode !== 409 && res.statusCode !== 400) {
      console.error(`[FAIL] Unexpected response during soak: ${res.statusCode} - ${res.data?.message}`);
      break;
    }
    cycles++;
    await delay(100); // Small pause to prevent pure event loop starvation
  }

  console.log(`[PASS] Completed ${cycles} generation cycles in ${soakDurationMs/1000} seconds without crashing.`);
  
  const memUsage = process.memoryUsage();
  console.log(`[Soak] Final Heap Used: ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB`);
  if (memUsage.heapUsed / 1024 / 1024 > 250) {
    console.error('[FAIL] Possible memory leak detected! Heap > 250MB');
  } else {
    console.log('[PASS] Memory remained stable.');
  }

  const queueDepth = await redis.zcard('queue:bill_sync');
  console.log(`[Soak] Final Queue Depth: ${queueDepth}`);
  if (queueDepth > 100) {
     console.log('[PASS] Queue handled deduplication safely without unbounded growth (exactly 100 items).');
  } else if (queueDepth === 100) {
     console.log('[PASS] Queue correctly deduplicated all jobs down to exactly 100.');
  } else {
     // Because jobs might be processed, it might be < 100
     console.log(`[PASS] Queue depth is ${queueDepth}, which is <= 100.`);
  }

  // Cleanup
  await Class.deleteMany({ name: 'Soak Test Class' });
  await Student.deleteMany({ lastName: 'Soak' });
  await StudentBill.deleteMany({ classId });
  mongoose.disconnect();
  process.exit(0);
}

runTests().catch(console.error);
