const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Initialize ioredis with connection retry limits to prevent crashing / infinite loops on failure
const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    // Stop retrying after 3 attempts
    if (times > 3) {
      console.warn('[REDIS] Connection failed. Giving up retries.');
      return null; 
    }
    return Math.min(times * 50, 2000);
  }
});

redis.on('error', (err) => {
  console.warn('[REDIS] Warning: Redis encountered an error (system will fallback to DB).', err.message);
});

redis.on('connect', () => {
  console.log('[REDIS] Successfully connected.');
});

module.exports = redis;
