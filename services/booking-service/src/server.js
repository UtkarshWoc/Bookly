const config = require('./config');
const app = require('./app');
const redis = require('./config/redis');
const eventRedis = require('./config/eventRedis');
const seatClient = require('./clients/seat.client');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const { startExpirySweeper } = require('./services/booking.service');
const logger = require('./utils/logger');

async function start() {
  await connectDatabase();

  const stopSweeper = startExpirySweeper();
  const server = app.listen(config.port, () => logger.info(`Listening on :${config.port}`));

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    stopSweeper();
    server.close(async () => {
      seatClient.close();
      await Promise.allSettled([disconnectDatabase(), redis.quit(), eventRedis.quit()]);
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
