const config = require('./config');
const { grpc } = require('./config/grpc');
const redis = require('./config/redis');
const { connectDatabase, disconnectDatabase } = require('./config/database');
const registerSeatRoutes = require('./routes/seat.routes');
const logger = require('./utils/logger');

async function start() {
  await connectDatabase();

  const server = new grpc.Server();
  registerSeatRoutes(server);

  await new Promise((resolve, reject) => {
    server.bindAsync(`0.0.0.0:${config.port}`, grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) return reject(err);
      logger.info(`gRPC server listening on :${port}`);
      resolve();
    });
  });

  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.tryShutdown(async () => {
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
