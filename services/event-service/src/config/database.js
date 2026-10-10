const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

async function connectDatabase() {
  await mongoose.connect(config.mongo.uri, { dbName: config.mongo.dbName });
  logger.info(`MongoDB connected (db: ${config.mongo.dbName})`);
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

module.exports = { connectDatabase, disconnectDatabase };
