const { isValidObjectId } = require('mongoose');
const Booking = require('../models/booking.model');
const seatClient = require('../clients/seat.client');
const eventClient = require('../clients/event.client');
const paymentService = require('./payment.service');
const publisher = require('./eventPublisher.service');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const SEAT_PATTERN = /^([A-Z])([1-9][0-9]?)$/;

function assertSeatsExist(seats, layout) {
  const invalid = seats.filter((seat) => {
    const match = SEAT_PATTERN.exec(seat);
    if (!match) return true;
    const row = match[1].charCodeAt(0) - 65;
    const number = Number(match[2]);
    return row >= layout.rows || number > layout.seatsPerRow;
  });
  if (invalid.length) throw ApiError.badRequest(`Seats do not exist for this event: ${invalid.join(', ')}`);
}

// Best-effort compensation: a failed release is harmless because the lock TTL expires anyway.
async function releaseQuietly(booking) {
  try {
    await seatClient.releaseSeats({ eventId: booking.eventId, seatNos: booking.seats, userId: booking.userId });
  } catch (err) {
    logger.warn(`Release for booking ${booking.id} failed, lock will expire on its own: ${err.message}`);
  }
}

async function expireIfStale(booking) {
  const captured = booking.payment?.status === 'CAPTURED';
  if (booking.status === 'PENDING' && !captured && booking.holdExpiresAt <= new Date()) {
    booking.status = 'EXPIRED';
    booking.failureReason = 'Seat hold expired before payment';
    await booking.save();
  }
  return booking;
}

async function findOwned(userId, bookingId) {
  if (!isValidObjectId(bookingId)) throw ApiError.notFound('Booking not found');
  const booking = await Booking.findOne({ _id: bookingId, userId });
  if (!booking) throw ApiError.notFound('Booking not found');
  return expireIfStale(booking);
}

// Step 1: validate against the catalog and hold the seats (gRPC LockSeats).
async function createHold(userId, { eventId, seats }) {
  const event = await eventClient.getEvent(eventId);
  if (!event) throw ApiError.notFound('Event not found');
  if (new Date(event.startsAt) <= new Date()) throw ApiError.badRequest('This event has already started');
  assertSeatsExist(seats, event.layout);

  const lock = await seatClient.lockSeats({ eventId, seatNos: seats, userId });
  if (!lock.success) {
    throw ApiError.conflict('Some seats were just taken by someone else', { failedSeats: lock.failedSeats });
  }

  try {
    const booking = await Booking.create({
      userId,
      eventId,
      event: {
        title: event.title,
        venue: event.venue,
        city: event.city,
        category: event.category,
        startsAt: event.startsAt,
      },
      seats,
      unitPrice: event.price,
      amount: event.price * seats.length,
      currency: event.currency,
      status: 'PENDING',
      holdExpiresAt: new Date(Date.now() + lock.ttlSeconds * 1000),
    });
    return booking.toJSON();
  } catch (err) {
    await releaseQuietly({ id: 'unsaved', eventId, seats, userId });
    throw err;
  }
}

// Step 2: charge, then confirm (gRPC ConfirmSeats). Any failure releases the seats.
async function pay(userId, bookingId, { cardNumber }) {
  const booking = await findOwned(userId, bookingId);
  if (booking.status !== 'PENDING') {
    throw ApiError.conflict(`Booking is ${booking.status.toLowerCase()} and can no longer be paid`, {
      booking: booking.toJSON(),
    });
  }

  // A retry after a crash between capture and confirm must not charge twice.
  if (booking.payment?.status !== 'CAPTURED') {
    const payment = await paymentService.charge({ amount: booking.amount, currency: booking.currency, cardNumber });

    if (!payment.approved) {
      booking.status = 'FAILED';
      booking.failureReason = payment.reason;
      booking.payment = {
        status: 'DECLINED', reference: payment.reference, cardLast4: payment.cardLast4,
        failureReason: payment.reason, processedAt: new Date(),
      };
      await booking.save();
      await releaseQuietly(booking);
      await publisher.publish('booking.failed', booking.toJSON());
      throw new ApiError(402, 'Payment declined — your seats have been released', { booking: booking.toJSON() });
    }

    booking.payment = {
      status: 'CAPTURED', reference: payment.reference, cardLast4: payment.cardLast4, processedAt: new Date(),
    };
    await booking.save();
  }

  const confirm = await seatClient.confirmSeats({
    eventId: booking.eventId, seatNos: booking.seats, userId, bookingId: booking.id,
  });

  if (!confirm.success) {
    booking.status = 'FAILED';
    booking.failureReason = 'Seat hold expired before payment completed — payment refunded';
    booking.payment.status = 'REFUNDED';
    await booking.save();
    await releaseQuietly(booking);
    await publisher.publish('booking.failed', booking.toJSON());
    throw ApiError.conflict(booking.failureReason, { booking: booking.toJSON(), failedSeats: confirm.failedSeats });
  }

  booking.status = 'CONFIRMED';
  booking.confirmedAt = new Date();
  await booking.save();
  await publisher.publish('booking.confirmed', booking.toJSON());
  return booking.toJSON();
}

async function cancel(userId, bookingId) {
  const booking = await findOwned(userId, bookingId);
  if (booking.status !== 'PENDING') {
    throw ApiError.conflict(`Only pending bookings can be cancelled (this one is ${booking.status.toLowerCase()})`);
  }
  booking.status = 'CANCELLED';
  booking.failureReason = 'Cancelled by user';
  await booking.save();
  await releaseQuietly(booking);
  await publisher.publish('booking.cancelled', booking.toJSON());
  return booking.toJSON();
}

async function getById(userId, bookingId) {
  return (await findOwned(userId, bookingId)).toJSON();
}

async function listForUser(userId) {
  await Booking.updateMany(
    { userId, status: 'PENDING', holdExpiresAt: { $lte: new Date() }, 'payment.status': { $ne: 'CAPTURED' } },
    { $set: { status: 'EXPIRED', failureReason: 'Seat hold expired before payment' } },
  );
  const bookings = await Booking.find({ userId }).sort({ createdAt: -1 }).limit(100);
  return bookings.map((b) => b.toJSON());
}

async function getAvailability(eventId) {
  const map = await seatClient.getSeatMap({ eventId });
  return { eventId, lockedSeats: map.lockedSeats, bookedSeats: map.bookedSeats, lockTtlSeconds: map.lockTtlSeconds };
}

module.exports = { createHold, pay, cancel, getById, listForUser, getAvailability };
