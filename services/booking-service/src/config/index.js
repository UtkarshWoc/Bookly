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
  serviceName: 'booking-service',
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.BOOKING_SERVICE_PORT || 8003),
  mongo: {
    uri: required('MONGO_URI'),
    dbName: process.env.BOOKING_DB_NAME || 'bookly_bookings',
  },
  redisUrl: required('BOOKING_REDIS_URL'),
  seatService: {
    address: required('SEAT_SERVICE_ADDR'),
    protoPath: resolveProtoPath(),
    deadlineMs: Number(process.env.GRPC_DEADLINE_MS || 2000),
    maxRetries: Number(process.env.GRPC_MAX_RETRIES || 2),
  },
  eventService: {
    url: required('EVENT_SERVICE_URL'),
    timeoutMs: Number(process.env.EVENT_SERVICE_TIMEOUT_MS || 2000),
  },
  idempotencyTtlSeconds: Number(process.env.IDEMPOTENCY_TTL_SECONDS || 86400),
  maxSeatsPerBooking: Number(process.env.MAX_SEATS_PER_BOOKING || 8),
  payment: {
    latencyMs: Number(process.env.PAYMENT_LATENCY_MS || 700),
    declineCard: process.env.PAYMENT_DECLINE_CARD || '4000000000000002',
  },
  bookingEventsChannel: process.env.BOOKING_EVENTS_CHANNEL || 'bookly.bookings',
});
