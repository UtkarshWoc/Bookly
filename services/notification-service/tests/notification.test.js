const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.MONGO_URI = 'mongodb://localhost:27017';
process.env.NOTIFICATION_REDIS_URL = 'redis://localhost:6379/4';

const acked = [];
const fakeSubscriber = {
  status: 'ready',
  on() {},
  once() {},
  async xack(_stream, _group, id) {
    acked.push(id);
    return 1;
  },
  disconnect() {},
};
require.cache[require.resolve('ioredis')] = {
  id: require.resolve('ioredis'),
  filename: require.resolve('ioredis'),
  loaded: true,
  exports: function MockRedis() {
    return fakeSubscriber;
  },
};

const notificationService = require('../src/services/notification.service');
const Notification = require('../src/models/notification.model');
const { parseFields, processEntries } = require('../src/subscribers/booking.subscriber');

const VALID_ID = '507f1f77bcf86cd799439011';

describe('notification.service', () => {
  beforeEach(() => {
    acked.length = 0;
  });

  it('creates a formatted notification for booking.confirmed', async (t) => {
    let created = null;
    t.mock.method(Notification, 'create', async (doc) => {
      created = doc;
      return doc;
    });

    await notificationService.handleBookingEvent({
      eventId: 'b1:booking.confirmed',
      type: 'booking.confirmed',
      data: {
        userId: 'u1',
        bookingId: 'b1',
        eventId: 'e1',
        eventTitle: 'Jazz Night',
        seats: ['A1', 'A2'],
        amount: 2400,
        currency: 'INR',
      },
    });

    assert.equal(created.title, 'Booking confirmed');
    assert.equal(created.eventKey, 'b1:booking.confirmed');
    assert.match(created.message, /Jazz Night/);
    assert.match(created.message, /A1, A2/);
  });

  it('deduplicates re-delivered events when Mongo rejects duplicate eventKey (11000)', async (t) => {
    t.mock.method(Notification, 'create', async () => {
      const err = new Error('duplicate key');
      err.code = 11000;
      throw err;
    });
    const res = await notificationService.handleBookingEvent({
      eventId: 'b1:booking.confirmed',
      type: 'booking.confirmed',
      data: { userId: 'u1', bookingId: 'b1', eventTitle: 'Show', seats: ['A1'], amount: 500, currency: 'INR' },
    });
    assert.equal(res, null);
  });

  it('ignores unknown event types safely', async () => {
    const res = await notificationService.handleBookingEvent({ type: 'booking.unknown', data: { userId: 'u1' } });
    assert.equal(res, null);
  });

  it('marks individual notification as read and rejects bad ids with 404', async (t) => {
    await assert.rejects(() => notificationService.markRead('u1', 'bad-id'), { status: 404 });

    t.mock.method(Notification, 'findOneAndUpdate', async () => ({
      toJSON: () => ({ id: VALID_ID, read: true }),
    }));
    const updated = await notificationService.markRead('u1', VALID_ID);
    assert.equal(updated.read, true);
  });
});

describe('booking.subscriber (Redis Streams)', () => {
  beforeEach(() => {
    acked.length = 0;
  });

  it('acknowledges stream entry only after persistence succeeds and leaves failures pending', async (t) => {
    let callCount = 0;
    t.mock.method(Notification, 'create', async (doc) => {
      callCount += 1;
      if (callCount === 1) throw new Error('transient DB error');
      return doc;
    });

    const payload = JSON.stringify({
      eventId: 'b2:booking.confirmed',
      type: 'booking.confirmed',
      data: { userId: 'u1', bookingId: 'b2', eventTitle: 'Show', seats: ['A1'], amount: 500, currency: 'INR' },
    });

    const parsed = parseFields(['eventId', 'b2:booking.confirmed', 'payload', payload]);
    assert.equal(parsed.eventId, 'b2:booking.confirmed');

    // First entry fails persistence -> NOT acked. Second succeeds -> acked.
    await processEntries([
      ['1000-0', ['eventId', 'b2:booking.confirmed', 'payload', payload]],
      ['1000-1', ['eventId', 'b2:booking.confirmed', 'payload', payload]],
    ]);
    assert.deepEqual(acked, ['1000-1']);
  });
});
