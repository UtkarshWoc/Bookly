const { isValidObjectId } = require('mongoose');
const Notification = require('../models/notification.model');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

function formatAmount(amount, currency) {
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

const TEMPLATES = {
  'booking.confirmed': (d) => ({
    title: 'Booking confirmed',
    message: `You're going to ${d.eventTitle}! Seats ${d.seats.join(', ')} are yours — ${formatAmount(d.amount, d.currency)} paid.`,
  }),
  'booking.failed': (d) => ({
    title: 'Booking failed',
    message: `We couldn't complete your booking for ${d.eventTitle}: ${d.reason || 'payment failed'}. Seats ${d.seats.join(', ')} were released.`,
  }),
  'booking.cancelled': (d) => ({
    title: 'Hold released',
    message: `You released seats ${d.seats.join(', ')} for ${d.eventTitle}.`,
  }),
};

// Turns a booking domain event into a stored notification (+ a simulated email in the logs).
async function handleBookingEvent({ type, data }) {
  const template = TEMPLATES[type];
  if (!template || !data?.userId) return null;

  const { title, message } = template(data);
  const notification = await Notification.create({
    userId: data.userId, type, title, message, bookingId: data.bookingId, eventId: data.eventId,
  });
  logger.info(`[email -> user ${data.userId}] ${title}: ${message}`);
  return notification;
}

async function listForUser(userId) {
  const [items, unread] = await Promise.all([
    Notification.find({ userId }).sort({ createdAt: -1 }).limit(50),
    Notification.countDocuments({ userId, read: false }),
  ]);
  return { data: items.map((n) => n.toJSON()), unread };
}

async function markRead(userId, id) {
  if (!isValidObjectId(id)) throw ApiError.notFound('Notification not found');
  const notification = await Notification.findOneAndUpdate({ _id: id, userId }, { read: true }, { new: true });
  if (!notification) throw ApiError.notFound('Notification not found');
  return notification.toJSON();
}

async function markAllRead(userId) {
  const { modifiedCount } = await Notification.updateMany({ userId, read: false }, { read: true });
  return { updated: modifiedCount };
}

module.exports = { handleBookingEvent, listForUser, markRead, markAllRead };
