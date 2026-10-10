const config = require('../config');
const redis = require('../config/redis');
const logger = require('../utils/logger');

// Fire-and-forget domain events over Redis Pub/Sub. booking-service does not know
// (or care) who listens — today it is notification-service.
async function publish(type, booking) {
  const message = {
    type,
    occurredAt: new Date().toISOString(),
    data: {
      bookingId: booking.id,
      userId: booking.userId,
      eventId: booking.eventId,
      eventTitle: booking.event?.title,
      startsAt: booking.event?.startsAt,
      seats: booking.seats,
      amount: booking.amount,
      currency: booking.currency,
      status: booking.status,
      reason: booking.failureReason,
    },
  };
  try {
    await redis.publish(config.bookingEventsChannel, JSON.stringify(message));
  } catch (err) {
    logger.warn(`Failed to publish ${type}: ${err.message}`);
  }
}

module.exports = { publish };
