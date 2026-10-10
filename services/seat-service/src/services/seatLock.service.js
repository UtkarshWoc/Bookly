const config = require('../config');
const redis = require('../config/redis');
const BookedSeat = require('../models/bookedSeat.model');
const logger = require('../utils/logger');

const lockKey = (eventId, seatNo) => `seat:${eventId}:${seatNo}`;

// Delete a lock only if this user still owns it — never release someone else's hold.
redis.defineCommand('releaseIfOwner', {
  numberOfKeys: 1,
  lua: "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
});

async function findBooked(eventId, seatNos) {
  return BookedSeat.find({ eventId, seatNo: { $in: seatNos } }).distinct('seatNo');
}

// Returns 'acquired' (new lock), 'refreshed' (already ours, TTL extended) or 'taken'.
async function acquire(eventId, seatNo, userId) {
  const key = lockKey(eventId, seatNo);
  const ok = await redis.set(key, userId, 'EX', config.lockTtlSeconds, 'NX');
  if (ok) return 'acquired';
  if ((await redis.get(key)) === userId) {
    await redis.expire(key, config.lockTtlSeconds);
    return 'refreshed';
  }
  return 'taken';
}

async function releaseSeats({ eventId, seatNos, userId }) {
  const results = await Promise.all(
    seatNos.map((seatNo) => redis.releaseIfOwner(lockKey(eventId, seatNo), userId)),
  );
  return { releasedCount: results.reduce((sum, n) => sum + Number(n), 0) };
}

async function lockSeats({ eventId, seatNos, userId }) {
  const booked = await findBooked(eventId, seatNos);
  if (booked.length) return { success: false, failedSeats: booked, ttlSeconds: 0 };

  const outcomes = await Promise.all(seatNos.map((seatNo) => acquire(eventId, seatNo, userId)));
  const failedSeats = seatNos.filter((_, i) => outcomes[i] === 'taken');

  if (failedSeats.length) {
    // All-or-nothing: roll back only the locks this call created.
    const newlyAcquired = seatNos.filter((_, i) => outcomes[i] === 'acquired');
    if (newlyAcquired.length) await releaseSeats({ eventId, seatNos: newlyAcquired, userId });
    return { success: false, failedSeats, ttlSeconds: 0 };
  }

  return { success: true, failedSeats: [], ttlSeconds: config.lockTtlSeconds };
}

async function confirmSeats({ eventId, seatNos, userId, bookingId }) {
  // Idempotency: seats already sold to this booking count as confirmed.
  const alreadyConfirmed = new Set(
    await BookedSeat.find({ eventId, bookingId, seatNo: { $in: seatNos } }).distinct('seatNo'),
  );
  const pending = seatNos.filter((s) => !alreadyConfirmed.has(s));
  if (pending.length === 0) return { success: true, failedSeats: [] };

  const holders = await redis.mget(pending.map((s) => lockKey(eventId, s)));
  const failedSeats = pending.filter((_, i) => holders[i] !== userId);
  if (failedSeats.length) return { success: false, failedSeats };

  try {
    await BookedSeat.insertMany(pending.map((seatNo) => ({ eventId, seatNo, userId, bookingId })));
  } catch (err) {
    if (err.code !== 11000) throw err;
    // Should be impossible while we hold the locks; undo any partial insert to stay consistent.
    await BookedSeat.deleteMany({ eventId, bookingId, seatNo: { $in: pending } });
    logger.warn(`Duplicate sale prevented for event ${eventId}, booking ${bookingId}`);
    return { success: false, failedSeats: pending };
  }

  await releaseSeats({ eventId, seatNos: pending, userId });
  return { success: true, failedSeats: [] };
}

async function getSeatMap({ eventId }) {
  const lockedSeats = [];
  const stream = redis.scanStream({ match: lockKey(eventId, '*'), count: 200 });
  for await (const keys of stream) {
    keys.forEach((key) => lockedSeats.push(key.slice(key.lastIndexOf(':') + 1)));
  }
  const bookedSeats = await BookedSeat.find({ eventId }).distinct('seatNo');
  const booked = new Set(bookedSeats);
  return {
    lockedSeats: lockedSeats.filter((s) => !booked.has(s)),
    bookedSeats,
    lockTtlSeconds: config.lockTtlSeconds,
  };
}

module.exports = { lockSeats, confirmSeats, releaseSeats, getSeatMap };
