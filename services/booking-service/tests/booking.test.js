const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');

process.env.MONGO_URI = 'mongodb://localhost:27017';
process.env.BOOKING_REDIS_URL = 'redis://localhost:6379/3';
process.env.SEAT_SERVICE_ADDR = 'localhost:50051';
process.env.EVENT_SERVICE_URL = 'http://localhost:8002';
process.env.PAYMENT_LATENCY_MS = '1';

const redisStore = new Map();
const published = [];
const fakeRedis = {
  async set(key, value, ...args) {
    if (args.includes('NX') && redisStore.has(key)) return null;
    redisStore.set(key, value);
    return 'OK';
  },
  async get(key) {
    return redisStore.get(key) ?? null;
  },
  async del(key) {
    redisStore.delete(key);
    return 1;
  },
  async releaseIfOwner(key, owner) {
    if (redisStore.get(key) === owner) {
      redisStore.delete(key);
      return 1;
    }
    return 0;
  },
  async publish(channel, msg) {
    published.push({ channel, msg: JSON.parse(msg) });
    return 1;
  },
  async xadd(stream, ...args) {
    const payloadIdx = args.indexOf('payload');
    const msg = payloadIdx >= 0 ? JSON.parse(args[payloadIdx + 1]) : {};
    published.push({ stream, msg });
    return '1-0';
  },
};

require.cache[require.resolve('../src/config/redis')] = {
  id: require.resolve('../src/config/redis'),
  filename: require.resolve('../src/config/redis'),
  loaded: true,
  exports: fakeRedis,
};
require.cache[require.resolve('../src/config/eventRedis')] = {
  id: require.resolve('../src/config/eventRedis'),
  filename: require.resolve('../src/config/eventRedis'),
  loaded: true,
  exports: fakeRedis,
};

const idempotency = require('../src/middlewares/idempotency');
const bookingService = require('../src/services/booking.service');
const Booking = require('../src/models/booking.model');
const seatClient = require('../src/clients/seat.client');
const eventClient = require('../src/clients/event.client');
const { createBookingSchema, payBookingSchema } = require('../src/validators/booking.validators');

const EVENT_ID = '507f1f77bcf86cd799439011';
const BOOKING_ID = '507f1f77bcf86cd799439022';

function makeReqRes({ key, body = { seats: ['A1'] }, userId = 'u1', method = 'POST' } = {}) {
  const headers = {};
  const req = {
    method,
    baseUrl: '/bookings',
    path: '/',
    user: { id: userId },
    body,
    get: (name) => (name.toLowerCase() === 'idempotency-key' ? key : undefined),
  };
  let resolved;
  const done = new Promise((r) => {
    resolved = r;
  });
  const res = {
    statusCode: 200,
    headers,
    set(k, v) {
      headers[k.toLowerCase()] = v;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      resolved({ status: this.statusCode, headers, body: payload });
      return this;
    },
  };
  return { req, res, done };
}

describe('booking.validators', () => {
  it('normalizes eventId to lowercase and sorts/dedupes seats', () => {
    const parsed = createBookingSchema.parse({
      eventId: EVENT_ID.toUpperCase(),
      seats: ['b2', 'A1', 'b2'],
    });
    assert.equal(parsed.eventId, EVENT_ID);
    assert.deepEqual(parsed.seats, ['A1', 'B2']);
  });

  it('validates card with Luhn check and future expiry', () => {
    const badLuhn = payBookingSchema.safeParse({
      cardHolder: 'Ada',
      cardNumber: '4242 4242 4242 4241',
      expiry: '12/30',
      cvc: '123',
    });
    assert.equal(badLuhn.success, false);

    const good = payBookingSchema.safeParse({
      cardHolder: 'Ada Lovelace',
      cardNumber: '4242 4242 4242 4242',
      expiry: '12/30',
      cvc: '123',
    });
    assert.equal(good.success, true);
    assert.equal(good.data.cardNumber, '4242424242424242');
  });
});

describe('idempotency middleware', () => {
  beforeEach(() => redisStore.clear());

  it('persists response before resolving and replays identical retries without leaking card numbers', async () => {
    const key = 'idem-key-123456';
    const first = makeReqRes({ key, body: { cardNumber: '4242424242424242', cvc: '123' } });

    await new Promise((resolve, reject) => {
      idempotency(first.req, first.res, (err) => (err ? reject(err) : resolve()));
    });
    first.res.status(201).json({ ok: true });
    const out1 = await first.done;
    assert.equal(out1.status, 201);

    const storedRaw = [...redisStore.values()].find((v) => v.includes('"done"'));
    assert.ok(storedRaw);
    assert.equal(storedRaw.includes('4242424242424242'), false);

    const second = makeReqRes({ key, body: { cardNumber: '4242424242424242', cvc: '123' } });
    idempotency(second.req, second.res, (err) => {
      if (err) throw err;
    });
    const out2 = await second.done;
    assert.equal(out2.status, 201);
    assert.equal(out2.headers['idempotent-replayed'], 'true');

    // Reusing same key with a different body yields 422.
    const diff = makeReqRes({ key, body: { cardNumber: '4000000000000002', cvc: '123' } });
    const err = await new Promise((resolve) => {
      idempotency(diff.req, diff.res, resolve);
    });
    assert.equal(err.status, 422);
  });

  after(() => seatClient.close());
});

describe('booking.service', () => {
  beforeEach(() => {
    redisStore.clear();
    published.length = 0;
  });

  it('releases seats and publishes booking.failed when card is declined', async (t) => {
    const doc = {
      id: BOOKING_ID,
      userId: 'u1',
      eventId: EVENT_ID,
      event: { title: 'Concert', venue: 'Arena', city: 'Delhi', category: 'Concert', startsAt: new Date() },
      seats: ['A1'],
      unitPrice: 1000,
      amount: 1000,
      currency: 'INR',
      status: 'PENDING',
      holdExpiresAt: new Date(Date.now() + 60_000),
      async save() {},
      toJSON() {
        return {
          id: this.id,
          userId: this.userId,
          eventId: this.eventId,
          event: this.event,
          seats: this.seats,
          amount: this.amount,
          currency: this.currency,
          status: this.status,
          failureReason: this.failureReason,
          payment: this.payment,
        };
      },
    };

    t.mock.method(Booking, 'findOne', async () => doc);
    let released = false;
    t.mock.method(seatClient, 'releaseSeats', async () => {
      released = true;
      return { releasedCount: 1 };
    });

    await assert.rejects(
      () => bookingService.pay('u1', BOOKING_ID, { cardNumber: '4000000000000002' }),
      { status: 402 },
    );
    assert.equal(doc.status, 'FAILED');
    assert.equal(released, true);
    assert.equal(published[0].msg.type, 'booking.failed');
  });

  it('returns maxSeatsPerBooking in getAvailability', async (t) => {
    t.mock.method(seatClient, 'getSeatMap', async () => ({
      lockedSeats: ['A1'],
      bookedSeats: ['B1'],
      lockTtlSeconds: 300,
    }));
    const res = await bookingService.getAvailability(EVENT_ID.toUpperCase());
    assert.equal(res.eventId, EVENT_ID);
    assert.equal(res.maxSeatsPerBooking, 8);
  });

  it('rejects hold when event has already started', async (t) => {
    t.mock.method(eventClient, 'getEvent', async () => ({
      id: EVENT_ID,
      title: 'Old Show',
      startsAt: new Date(Date.now() - 10_000).toISOString(),
      layout: { rows: 5, seatsPerRow: 5 },
      price: 500,
    }));
    t.mock.method(Booking, 'find', () => ({ select: async () => [] }));

    await assert.rejects(
      () => bookingService.createHold('u1', { eventId: EVENT_ID, seats: ['A1'] }),
      { status: 400, message: 'This event has already started' },
    );
  });
});
