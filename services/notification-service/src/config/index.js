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
  serviceName: 'notification-service',
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.NOTIFICATION_SERVICE_PORT || 8004),
  mongo: {
    uri: required('MONGO_URI'),
    dbName: process.env.NOTIFICATION_DB_NAME || 'bookly_notifications',
  },
  redisUrl: required('NOTIFICATION_REDIS_URL'),
  bookingEventsChannel: process.env.BOOKING_EVENTS_CHANNEL || 'bookly.bookings',
});
