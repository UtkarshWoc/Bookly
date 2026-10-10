const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

const redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 3 });

// Compare-and-delete: release a key only if we still own it.
redis.defineCommand('releaseIfOwner', {
  numberOfKeys: 1,
  lua: "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
});

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error(`Redis error: ${err.message}`));

module.exports = redis;
