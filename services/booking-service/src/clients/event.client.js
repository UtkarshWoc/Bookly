const config = require('../config');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

// REST client for event-service. Only depends on its public contract: GET /events/:id.
async function getEvent(eventId) {
  const url = `${config.eventService.url}/events/${encodeURIComponent(eventId)}`;
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(config.eventService.timeoutMs) });
  } catch (err) {
    logger.warn(`event-service unreachable: ${err.message}`);
    throw ApiError.serviceUnavailable('Event catalog is unavailable, please try again');
  }
  if (response.status === 404) return null;
  if (!response.ok) throw ApiError.serviceUnavailable('Event catalog is unavailable, please try again');
  const { event } = await response.json();
  return event;
}

module.exports = { getEvent };
