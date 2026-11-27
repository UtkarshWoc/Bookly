const os = require('os');
const Redis = require('ioredis');
const config = require('../config');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');

// Dedicated Redis connection for blocking XREADGROUP stream reads.
const subscriber = new Redis(config.redisUrl, { maxRetriesPerRequest: 3 });
subscriber.on('error', (err) => {
  if (running) logger.error(`Redis stream client error: ${err.message}`);
});

const CONSUMER_NAME = `${os.hostname()}-${process.pid}`;
let running = false;
let loopPromise = null;

function parseFields(rawFields) {
  const map = {};
  for (let i = 0; i < rawFields.length; i += 2) {
    map[rawFields[i]] = rawFields[i + 1];
  }
  return map;
}

async function processEntries(entries) {
  for (const [id, rawFields] of entries) {
    if (!rawFields) continue;
    try {
      const fields = parseFields(rawFields);
      const event = JSON.parse(fields.payload);
      if (!event.eventId && fields.eventId) event.eventId = fields.eventId;
      await notificationService.handleBookingEvent(event);
      await subscriber.xack(config.bookingEventsStream, config.consumerGroup, id);
    } catch (err) {
      // Leave unacknowledged in the PEL so XAUTOCLAIM / pending recovery retries it.
      logger.error(`Failed to process stream entry ${id}: ${err.message}`);
    }
  }
}

async function ensureConsumerGroup() {
  try {
    await subscriber.xgroup('CREATE', config.bookingEventsStream, config.consumerGroup, '0', 'MKSTREAM');
  } catch (err) {
    if (!err.message.includes('BUSYGROUP')) throw err;
  }
}

async function drainPending() {
  const pending = await subscriber.xreadgroup(
    'GROUP',
    config.consumerGroup,
    CONSUMER_NAME,
    'COUNT',
    '50',
    'STREAMS',
    config.bookingEventsStream,
    '0',
  );
  if (pending?.[0]?.[1]?.length) {
    await processEntries(pending[0][1]);
  }

  // Reclaim stale unacknowledged entries from crashed consumers.
  const reclaimed = await subscriber.xautoclaim(
    config.bookingEventsStream,
    config.consumerGroup,
    CONSUMER_NAME,
    config.claimMinIdleMs,
    '0-0',
    'COUNT',
    '20',
  );
  if (reclaimed?.[1]?.length) {
    await processEntries(reclaimed[1]);
  }
}

async function consumeLoop() {
  let lastClaimCheck = Date.now();
  while (running) {
    try {
      if (Date.now() - lastClaimCheck >= config.claimMinIdleMs) {
        await drainPending();
        lastClaimCheck = Date.now();
      }
      const res = await subscriber.xreadgroup(
        'GROUP',
        config.consumerGroup,
        CONSUMER_NAME,
        'COUNT',
        '10',
        'BLOCK',
        '2000',
        'STREAMS',
        config.bookingEventsStream,
        '>',
      );
      if (res?.[0]?.[1]?.length) {
        await processEntries(res[0][1]);
      }
    } catch (err) {
      if (!running) break;
      logger.warn(`Stream read error, retrying: ${err.message}`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

async function startBookingSubscriber() {
  if (subscriber.status !== 'ready') {
    await new Promise((resolve) => subscriber.once('ready', resolve));
  }
  await ensureConsumerGroup();
  await drainPending();
  running = true;
  loopPromise = consumeLoop();
  logger.info(`Consuming Redis stream "${config.bookingEventsStream}" in group "${config.consumerGroup}"`);
}

async function stopBookingSubscriber() {
  running = false;
  subscriber.disconnect();
  if (loopPromise) await loopPromise.catch(() => {});
}

function isSubscribed() {
  return running && subscriber.status === 'ready';
}

module.exports = {
  startBookingSubscriber,
  stopBookingSubscriber,
  isSubscribed,
  parseFields,
  processEntries,
  subscriber,
};
