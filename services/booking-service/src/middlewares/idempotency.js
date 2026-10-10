const crypto = require('crypto');
const config = require('../config');
const redis = require('../config/redis');
const ApiError = require('../utils/ApiError');

const KEY_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;

/**
 * Makes a mutating endpoint safe to retry via the `Idempotency-Key` header.
 *
 *  - First request claims the key in Redis (SET NX) and runs normally; its
 *    response (status < 500) is stored for IDEMPOTENCY_TTL_SECONDS.
 *  - A retry with the same key replays the stored response instead of
 *    creating a duplicate booking or charging twice.
 *  - A retry while the first is still running gets 409.
 *  - Reusing a key with a different payload gets 422.
 *
 * Keys are scoped per user + route and shared across all booking-service replicas.
 */
function idempotency(req, res, next) {
  const key = req.get('Idempotency-Key');
  if (!key) return next();
  if (!KEY_PATTERN.test(key)) {
    return next(ApiError.badRequest('Idempotency-Key must be 8-100 characters of [A-Za-z0-9_-]'));
  }

  const redisKey = `idem:${req.user.id}:${req.method}:${req.baseUrl}${req.path}:${key}`;
  const fingerprint = crypto.createHash('sha256').update(JSON.stringify(req.body ?? {})).digest('hex');
  const ttl = config.idempotencyTtlSeconds;

  (async () => {
    const claimed = await redis.set(redisKey, JSON.stringify({ state: 'processing', fingerprint }), 'EX', ttl, 'NX');

    if (!claimed) {
      const record = JSON.parse((await redis.get(redisKey)) || 'null');
      if (!record) return next(ApiError.conflict('Idempotency key expired mid-flight, please retry'));
      if (record.fingerprint !== fingerprint) {
        return next(new ApiError(422, 'Idempotency-Key was already used with a different request body'));
      }
      if (record.state === 'processing') {
        return next(ApiError.conflict('A request with this Idempotency-Key is still being processed'));
      }
      res.set('Idempotent-Replayed', 'true');
      return res.status(record.status).json(record.body);
    }

    // Capture the eventual response so a retry can replay it.
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      const write = res.statusCode >= 500
        ? redis.del(redisKey) // server errors are not cached: the client may retry for real
        : redis.set(redisKey, JSON.stringify({ state: 'done', fingerprint, status: res.statusCode, body }), 'EX', ttl);
      write.catch(() => {});
      return originalJson(body);
    };
    next();
  })().catch(next);
}

module.exports = idempotency;
