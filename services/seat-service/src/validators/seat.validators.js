const config = require('../config');
const GrpcError = require('../utils/GrpcError');

const SEAT_PATTERN = /^[A-Z][1-9][0-9]?$/;

function requireString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw GrpcError.invalidArgument(`${field} is required`);
  }
  return value.trim();
}

function seatList(seatNos) {
  if (!Array.isArray(seatNos) || seatNos.length === 0) {
    throw GrpcError.invalidArgument('seat_nos must contain at least one seat');
  }
  if (seatNos.length > config.maxSeatsPerRequest) {
    throw GrpcError.invalidArgument(`At most ${config.maxSeatsPerRequest} seats per request`);
  }
  const normalized = [...new Set(seatNos.map((s) => String(s).trim().toUpperCase()))];
  const invalid = normalized.filter((s) => !SEAT_PATTERN.test(s));
  if (invalid.length) throw GrpcError.invalidArgument(`Invalid seat numbers: ${invalid.join(', ')}`);
  return normalized;
}

function seatRequest(req) {
  return {
    eventId: requireString(req.eventId, 'event_id'),
    seatNos: seatList(req.seatNos),
    userId: requireString(req.userId, 'user_id'),
  };
}

function confirmRequest(req) {
  return { ...seatRequest(req), bookingId: requireString(req.bookingId, 'booking_id') };
}

function seatMapRequest(req) {
  return { eventId: requireString(req.eventId, 'event_id') };
}

module.exports = { seatRequest, confirmRequest, seatMapRequest };
