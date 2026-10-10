const { status } = require('@grpc/grpc-js');
const seatLockService = require('../services/seatLock.service');
const validators = require('../validators/seat.validators');
const logger = require('../utils/logger');

// Adapts a promise-returning handler to a gRPC unary handler: validate -> service -> callback.
const unary = (name, parse, handler) => async (call, callback) => {
  const started = Date.now();
  try {
    const response = await handler(parse(call.request));
    logger.info(`${name} OK ${Date.now() - started}ms`);
    callback(null, response);
  } catch (err) {
    const code = err.code && Number.isInteger(err.code) && err.code < 17 ? err.code : status.INTERNAL;
    if (code === status.INTERNAL) logger.error(`${name} failed: ${err.stack || err.message}`);
    else logger.warn(`${name} rejected: ${err.message}`);
    callback({ code, message: code === status.INTERNAL ? 'Internal error' : err.message });
  }
};

module.exports = {
  lockSeats: unary('LockSeats', validators.seatRequest, seatLockService.lockSeats),
  confirmSeats: unary('ConfirmSeats', validators.confirmRequest, seatLockService.confirmSeats),
  releaseSeats: unary('ReleaseSeats', validators.seatRequest, seatLockService.releaseSeats),
  getSeatMap: unary('GetSeatMap', validators.seatMapRequest, seatLockService.getSeatMap),
};
