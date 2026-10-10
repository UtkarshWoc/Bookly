const path = require('path');

// Single root-level .env. In Docker the variables are injected by compose,
// so a missing file here is expected and harmless.
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env'), quiet: true });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

module.exports = Object.freeze({
  serviceName: 'event-service',
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.EVENT_SERVICE_PORT || 8002),
  mongo: {
    uri: required('MONGO_URI'),
    dbName: process.env.EVENT_DB_NAME || 'bookly_events',
  },
  redisUrl: required('EVENT_REDIS_URL'),
  cacheTtlSeconds: Number(process.env.EVENT_CACHE_TTL_SECONDS || 60),
  seedEvents: process.env.SEED_EVENTS === 'true',
});
