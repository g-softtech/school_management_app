require('dotenv').config();
process.env.MOCK_REDIS = 'true';
const { getRedisClient } = require('./src/config/redis');
const { enqueueSyncJob } = require('./src/utils/syncQueue');
const syncWorker = require('./src/workers/syncWorker');
const ledgerService = require('./src/services/ledgerService');

// Delay helper
const delay = ms => new Promise(res => setTimeout(res, ms));

async function runTest() {
  const redis = getRedisClient();
  const mockBillId1 = '64abcd123456789012345678';
  const mockBillId2 = '64abcd123456789012345679';

  // Clear queues
  await redis.del('queue:bill_sync');
  await redis.del('queue:bill_retries');
  await redis.del('queue:bill_deadletter');

  let attemptCount1 = 0;
  let attemptCount2 = 0;

  // Mock ledgerService.rebuildBillBalances
  ledgerService.rebuildBillBalances = async (billId) => {
    if (billId === mockBillId1) {
      attemptCount1++;
      if (attemptCount1 < 3) {
        throw new Error('Simulated failure (retry test)');
      }
      return true; // Success on 3rd attempt
    }
    if (billId === mockBillId2) {
      attemptCount2++;
      throw new Error('Simulated persistent failure (DLQ test)');
    }
  };

  console.log('\n--- Test 6: Worker Failure Recovery ---');
  await enqueueSyncJob(mockBillId1);
  syncWorker.start();
  
  // Wait for worker to process retries
  await delay(1000); // give it time to loop and process
  
  const retries1 = await redis.hget('queue:bill_retries', mockBillId1);
  if (!retries1 && attemptCount1 === 3) {
    console.log('[PASS] Worker successfully recovered on attempt 3 and cleared retry state.');
  } else {
    console.error(`[FAIL] Worker recovery test failed. Attempts: ${attemptCount1}, Retries left: ${retries1}`);
  }

  console.log('\n--- Test 7: DLQ Validation ---');
  await enqueueSyncJob(mockBillId2);
  
  // Wait for worker to exhaust retries (4 attempts)
  await delay(3000);
  
  const dlqEntry = await redis.hget('queue:bill_deadletter', mockBillId2);
  const retries2 = await redis.hget('queue:bill_retries', mockBillId2);
  
  if (dlqEntry && attemptCount2 === 4 && !retries2) {
    console.log('[PASS] Poisoned job safely moved to DLQ after 4 attempts.');
  } else {
    console.error(`[FAIL] DLQ test failed. Attempts: ${attemptCount2}, DLQ: ${dlqEntry}, Retries: ${retries2}`);
  }

  syncWorker.stop();
  process.exit(0);
}

runTest().catch(console.error);
