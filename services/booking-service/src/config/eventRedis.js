const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

// Dedicated Redis connection for the shared event-bus database (db4) so
// Redis Streams XADD lands in the same DB that notification-service consumes.
const eventRedis = new Redis(config.bookingEventsRedisUrl, { maxRetriesPerRequest: 3 });

eventRedis.on('connect', () => logger.info('Event bus Redis connected'));
eventRedis.on('error', (err) => logger.error(`Event bus Redis error: ${err.message}`));

module.exports = eventRedis;
