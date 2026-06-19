require('dotenv').config();
const { enqueueSyncJob } = require('./src/utils/syncQueue');
const { getRedisClient } = require('./src/config/redis');

async function run() {
  const redis = getRedisClient();
  if (redis.status !== 'ready') {
    await new Promise((resolve) => redis.on('ready', resolve));
  }
  const mockBillId = '64abcd123456789012345678';
  
  // Clear queue first for clean test
  await redis.del('queue:bill_sync');
  
  console.log('--- Test 5: Queue Deduplication Validation ---');
  console.log(`Enqueuing ${mockBillId} three times concurrently...`);
  
  const results = await Promise.all([
    enqueueSyncJob(mockBillId),
    enqueueSyncJob(mockBillId),
    enqueueSyncJob(mockBillId)
  ]);
  
  console.log('Enqueue Results:', results);
  
  const count = await redis.zcount('queue:bill_sync', '-inf', '+inf');
  console.log(`Queue Depth (zcount): ${count}`);
  
  const elements = await redis.zrange('queue:bill_sync', 0, -1);
  console.log('Elements in Queue:', elements);
  
  if (count === 1 && elements[0] === mockBillId) {
    console.log('\n[PASS] Queue deduplication successful. Only 1 entry exists.');
  } else {
    console.error('\n[FAIL] Queue deduplication failed!');
  }
  
  
  process.exit(0);
}

run();
