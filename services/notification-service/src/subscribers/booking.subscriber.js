const Redis = require('ioredis');
const config = require('../config');
const notificationService = require('../services/notification.service');
const logger = require('../utils/logger');

// A connection in subscribe mode cannot run other commands, so it gets its own client.
const subscriber = new Redis(config.redisUrl);
subscriber.on('error', (err) => logger.error(`Redis subscriber error: ${err.message}`));

async function startBookingSubscriber() {
  // Subscribing before the connection's ready-check completes breaks that check,
  // so wait for "ready". ioredis re-subscribes automatically after reconnects.
  if (subscriber.status !== 'ready') await new Promise((resolve) => subscriber.once('ready', resolve));

  subscriber.on('message', async (channel, raw) => {
    try {
      const event = JSON.parse(raw);
      await notificationService.handleBookingEvent(event);
    } catch (err) {
      logger.error(`Failed to handle message on ${channel}: ${err.message}`);
    }
  });
  await subscriber.subscribe(config.bookingEventsChannel);
  logger.info(`Subscribed to Redis channel "${config.bookingEventsChannel}"`);
}

function isSubscribed() {
  return subscriber.status === 'ready';
}

module.exports = { startBookingSubscriber, isSubscribed, subscriber };
