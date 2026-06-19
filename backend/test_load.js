require('dotenv').config();
process.env.MOCK_REDIS = 'true';
const mongoose = require('mongoose');
const Class = require('./src/models/Class');
const Student = require('./src/models/Student');
const FeeStructure = require('./src/models/FeeStructure');
const StudentBill = require('./src/models/StudentBill');
const { generateBills } = require('./src/modules/studentBill/studentBill.controller');
const syncQueue = require('./src/utils/syncQueue');
const v8 = require('v8');

const TEST_SIZES = [100, 1000, 5000];
let currentClassId = null;

let metrics = {
  bulkWriteDuration: 0,
  enqueueDuration: 0
};

// Monkeypatch bulkWrite
const originalBulkWrite = StudentBill.bulkWrite.bind(StudentBill);
StudentBill.bulkWrite = async function(ops, options) {
  const start = performance.now();
  const result = await originalBulkWrite(ops, options);
  metrics.bulkWriteDuration = performance.now() - start;
  return result;
};

// Monkeypatch enqueueSyncJob
const originalEnqueue = syncQueue.enqueueSyncJob;
syncQueue.enqueueSyncJob = async function(billId) {
  const start = performance.now();
  const result = await originalEnqueue(billId);
  metrics.enqueueDuration += (performance.now() - start);
  return result;
};

function mockRes() {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.data = data; return res; };
  return res;
}

async function setupScaleData(count) {
  console.log(`\n[+] Setting up ${count} students...`);
  
  const testClass = await Class.create({ 
    name: `Load Test Class ${count}`, 
    classTeacher: new mongoose.Types.ObjectId(),
    academicYear: '2025/2026'
  });
  currentClassId = testClass._id;

  const students = [];
  for(let i=0; i<count; i++) {
    students.push({
      firstName: `Student_${i}`,
      lastName: 'Load',
      admissionNumber: `LOAD-${count}-${i}`,
      userId: new mongoose.Types.ObjectId(),
      classId: testClass._id,
      isActive: true,
      gender: 'male',
      dateOfBirth: new Date()
    });
  }
  
  // Insert in batches of 1000 to avoid memory crash during setup
  for(let i=0; i<count; i+=1000) {
    await Student.insertMany(students.slice(i, i+1000));
  }

  await FeeStructure.create({
    name: 'Tuition Fee Load',
    feeType: 'tuition',
    amount: 50000,
    session: '2025/2026',
    term: 'first',
    scope: 'specific_class',
    classId: testClass._id,
    isActive: true
  });
  
  return testClass._id;
}

async function cleanupScaleData(classId, count) {
  await StudentBill.deleteMany({ classId });
  await Student.deleteMany({ classId });
  await FeeStructure.deleteMany({ classId });
  await Class.deleteOne({ _id: classId });
}

async function runScaleTest(count) {
  const classId = await setupScaleData(count);
  metrics.bulkWriteDuration = 0;
  metrics.enqueueDuration = 0;

  const req = { body: { classId, session: '2025/2026', term: 'first' }, user: { _id: new mongoose.Types.ObjectId() } };
  const res = mockRes();

  global.gc && global.gc(); // force GC if enabled
  const memBefore = process.memoryUsage().heapUsed;
  
  const start = performance.now();
  await generateBills(req, res);
  const duration = performance.now() - start;
  
  const memAfter = process.memoryUsage().heapUsed;
  const peakMem = process.memoryUsage().heapTotal;

  console.log(`\n--- Scale Test: ${count} Students ---`);
  console.log(`API Response: ${res.statusCode} ${res.data.message || res.data.summary}`);
  console.log(`Generation Duration: ${duration.toFixed(2)} ms`);
  console.log(`BulkWrite Duration:  ${metrics.bulkWriteDuration.toFixed(2)} ms`);
  console.log(`Queue Enqueue Duration: ${metrics.enqueueDuration.toFixed(2)} ms`);
  console.log(`Heap Used Before: ${(memBefore / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap Used After:  ${(memAfter / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Peak Heap Total:  ${(peakMem / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Throughput:       ${(count / (duration / 1000)).toFixed(2)} bills/sec`);

  await cleanupScaleData(classId, count);
}

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  // Cleanup abandoned data from crashed tests
  await Class.deleteMany({ name: /Load Test Class/ });
  await Student.deleteMany({ admissionNumber: /LOAD-/ });
  await FeeStructure.deleteMany({ name: 'Tuition Fee Load' });

  for (const count of TEST_SIZES) {
    await runScaleTest(count);
  }

  mongoose.disconnect();
  process.exit(0);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
