const config = require('./config');
const app = require('./app');
const redis = require('./config/redis');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const seedEvents = require('./seed/events.seed');
const logger = require('./utils/logger');

async function start() {
  await connectDatabase();
  if (config.seedEvents) await seedEvents();

  const server = app.listen(config.port, () => logger.info(`Listening on :${config.port}`));

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await Promise.allSettled([disconnectDatabase(), redis.quit()]);
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
