const redis = require('../config/redis');
const logger = require('../utils/logger');

// Thin JSON cache over Redis. Cache failures never break a request:
// we log and fall through to the database.

async function getJSON(key) {
  try {
    const raw = await redis.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.warn(`cache get failed for ${key}: ${err.message}`);
    return null;
  }
}

async function setJSON(key, value, ttlSeconds) {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn(`cache set failed for ${key}: ${err.message}`);
  }
}

async function del(key) {
  try {
    await redis.del(key);
  } catch (err) {
    logger.warn(`cache delete failed for ${key}: ${err.message}`);
  }
}

module.exports = { getJSON, setJSON, del };
