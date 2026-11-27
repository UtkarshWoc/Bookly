const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

process.env.MONGO_URI = 'mongodb://localhost:27017';
process.env.NOTIFICATION_REDIS_URL = 'redis://localhost:6379/4';

const notificationService = require('../src/services/notification.service');
const Notification = require('../src/models/notification.model');

const VALID_ID = '507f1f77bcf86cd799439011';

describe('notification.service', () => {
  it('creates a formatted notification for booking.confirmed', async (t) => {
    let created = null;
    t.mock.method(Notification, 'create', async (doc) => {
      created = doc;
      return doc;
    });

    await notificationService.handleBookingEvent({
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
    assert.match(created.message, /Jazz Night/);
    assert.match(created.message, /A1, A2/);
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
