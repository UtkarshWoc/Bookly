const fs = require('fs');
const path = require('path');

// Single root-level .env. In Docker the variables are injected by compose,
// so a missing file here is expected and harmless.
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env'), quiet: true });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

// The proto is copied to /app/proto in the image; locally it lives at the repo root.
function resolveProtoPath() {
  const candidates = [
    process.env.SEAT_PROTO_PATH,
    path.resolve(__dirname, '../../proto/seat.proto'),
    path.resolve(__dirname, '../../../../proto/seat.proto'),
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) throw new Error(`seat.proto not found (looked in: ${candidates.join(', ')})`);
  return found;
}

module.exports = Object.freeze({
  serviceName: 'seat-service',
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.SEAT_SERVICE_PORT || 50051),
  protoPath: resolveProtoPath(),
  mongo: {
    uri: required('MONGO_URI'),
    dbName: process.env.SEAT_DB_NAME || 'bookly_seats',
  },
  redisUrl: required('SEAT_REDIS_URL'),
  lockTtlSeconds: Number(process.env.SEAT_LOCK_TTL_SECONDS || 300),
  maxSeatsPerRequest: 20,
});
