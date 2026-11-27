const crypto = require('crypto');
const config = require('../config');
const eventRedis = require('../config/eventRedis');
const logger = require('../utils/logger');

// Durable at-least-once domain events over Redis Streams (XADD).
// Consumers read via consumer groups and acknowledge only after persisting.
async function publish(type, booking) {
  const eventId = booking?.id ? `${booking.id}:${type}` : crypto.randomUUID();
  const message = {
    eventId,
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
    await eventRedis.xadd(
      config.bookingEventsStream,
      'MAXLEN',
      '~',
      '10000',
      '*',
      'eventId',
      eventId,
      'type',
      type,
      'payload',
      JSON.stringify(message),
    );
  } catch (err) {
    logger.warn(`Failed to publish ${type} to stream: ${err.message}`);
  }
}

module.exports = { publish };
