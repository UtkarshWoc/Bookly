const config = require('./config');
const app = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { startBookingSubscriber, stopBookingSubscriber } = require('./subscribers/booking.subscriber');
const logger = require('./utils/logger');

async function start() {
  await connectDatabase();
  await startBookingSubscriber();

  const server = app.listen(config.port, () => logger.info(`Listening on :${config.port}`));

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await Promise.allSettled([stopBookingSubscriber(), disconnectDatabase()]);
      process.exit(0);
    });
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

start().catch((err) => {
  logger.error(`Failed to start: ${err.stack || err.message}`);
  process.exit(1);
});
