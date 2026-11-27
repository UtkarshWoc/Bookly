const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.MONGO_URI = 'mongodb://localhost:27017';
process.env.SEAT_REDIS_URL = 'redis://localhost:6379/2';
process.env.SEAT_LOCK_TTL_SECONDS = '300';

// Minimal in-memory Redis mock supporting NX, EX, expire, mget, scanStream and releaseIfOwner Lua semantics.
const lockStore = new Map();
const fakeRedis = {
  defineCommand() {},
  async set(key, value, ...args) {
    if (args.includes('NX') && lockStore.has(key)) return null;
    lockStore.set(key, value);
    return 'OK';
  },
  async get(key) {
    return lockStore.get(key) ?? null;
  },
  async expire(key) {
    return lockStore.has(key) ? 1 : 0;
  },
  async mget(keys) {
    return keys.map((k) => lockStore.get(k) ?? null);
  },
  async releaseIfOwner(key, owner) {
    if (lockStore.get(key) === owner) {
      lockStore.delete(key);
      return 1;
    }
    return 0;
  },
  scanStream({ match }) {
    const prefix = match.replace('*', '');
    const matched = [...lockStore.keys()].filter((k) => k.startsWith(prefix));
    return (async function* () {
      if (matched.length) yield matched;
    })();
  },
};

require.cache[require.resolve('../src/config/redis')] = {
  id: require.resolve('../src/config/redis'),
  filename: require.resolve('../src/config/redis'),
  loaded: true,
  exports: fakeRedis,
};

const seatLockService = require('../src/services/seatLock.service');
const BookedSeat = require('../src/models/bookedSeat.model');
const { seatRequest, confirmRequest } = require('../src/validators/seat.validators');

describe('seat.validators', () => {
  it('normalizes, deduplicates and validates seat numbers', () => {
    const parsed = seatRequest({ eventId: ' evt-1 ', seatNos: [' a1 ', 'A1', 'b2'], userId: 'u1' });
    assert.deepEqual(parsed.seatNos, ['A1', 'B2']);
    assert.equal(parsed.eventId, 'evt-1');
  });

  it('rejects invalid seat format and missing bookingId on confirm', () => {
    assert.throws(() => seatRequest({ eventId: 'e1', seatNos: ['Z0'], userId: 'u1' }), /Invalid seat/);
    assert.throws(() => confirmRequest({ eventId: 'e1', seatNos: ['A1'], userId: 'u1', bookingId: '' }), /booking_id/);
  });
});

describe('seatLock.service', () => {
  beforeEach(() => lockStore.clear());

  it('acquires all-or-nothing locks and rolls back newly acquired locks on conflict', async (t) => {
    t.mock.method(BookedSeat, 'find', () => ({ distinct: async () => [] }));
    lockStore.set('seat:evt1:A2', 'other-user');

    const res = await seatLockService.lockSeats({ eventId: 'evt1', seatNos: ['A1', 'A2'], userId: 'alice' });
    assert.equal(res.success, false);
    assert.deepEqual(res.failedSeats, ['A2']);
    assert.equal(lockStore.has('seat:evt1:A1'), false);
    assert.equal(lockStore.get('seat:evt1:A2'), 'other-user');
  });

  it('never releases locks owned by another user', async () => {
    lockStore.set('seat:evt1:A1', 'alice');
    lockStore.set('seat:evt1:A2', 'bob');

    const res = await seatLockService.releaseSeats({ eventId: 'evt1', seatNos: ['A1', 'A2'], userId: 'alice' });
    assert.equal(res.releasedCount, 1);
    assert.equal(lockStore.has('seat:evt1:A1'), false);
    assert.equal(lockStore.get('seat:evt1:A2'), 'bob');
  });

  it('confirms held seats idempotently and deduplicates booked seats from lockedSeats', async (t) => {
    let confirmed = [];
    t.mock.method(BookedSeat, 'find', (query) => ({
      distinct: async () => (query.bookingId ? confirmed : confirmed),
    }));
    t.mock.method(BookedSeat, 'insertMany', async (docs) => {
      confirmed = docs.map((d) => d.seatNo);
      return docs;
    });

    await seatLockService.lockSeats({ eventId: 'evt1', seatNos: ['A1', 'A2'], userId: 'alice' });
    const first = await seatLockService.confirmSeats({
      eventId: 'evt1',
      seatNos: ['A1', 'A2'],
      userId: 'alice',
      bookingId: 'bk1',
    });
    assert.equal(first.success, true);
    assert.equal(lockStore.has('seat:evt1:A1'), false);

    // Retry confirmSeats for the same booking succeeds idempotently even after locks were deleted.
    const retry = await seatLockService.confirmSeats({
      eventId: 'evt1',
      seatNos: ['A1', 'A2'],
      userId: 'alice',
      bookingId: 'bk1',
    });
    assert.equal(retry.success, true);

    // Simulate stale lock key alongside booked seat and ensure getSeatMap deduplicates.
    lockStore.set('seat:evt1:A1', 'stale');
    lockStore.set('seat:evt1:B1', 'bob');
    const map = await seatLockService.getSeatMap({ eventId: 'evt1' });
    assert.deepEqual(map.bookedSeats, ['A1', 'A2']);
    assert.deepEqual(map.lockedSeats, ['B1']);
  });
});
