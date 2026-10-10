const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const config = require('../config');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

const { address, protoPath, deadlineMs, maxRetries } = config.seatService;

const packageDefinition = protoLoader.loadSync(protoPath, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const { SeatService } = grpc.loadPackageDefinition(packageDefinition).bookly.seat.v1;

const client = new SeatService(address, grpc.credentials.createInsecure());

// Every SeatService RPC is idempotent (re-locking your own seat refreshes it,
// confirm is keyed by booking id, release is owner-checked), so transient
// failures can be retried safely.
const RETRYABLE = new Set([grpc.status.UNAVAILABLE, grpc.status.DEADLINE_EXCEEDED, grpc.status.RESOURCE_EXHAUSTED]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function callOnce(method, request) {
  return new Promise((resolve, reject) => {
    const deadline = new Date(Date.now() + deadlineMs);
    client[method](request, { deadline }, (err, response) => (err ? reject(err) : resolve(response)));
  });
}

async function call(method, request) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await callOnce(method, request);
    } catch (err) {
      const retryable = RETRYABLE.has(err.code);
      if (!retryable || attempt >= maxRetries) {
        logger.warn(`SeatService.${method} failed after ${attempt + 1} attempt(s): ${err.details || err.message}`);
        if (err.code === grpc.status.INVALID_ARGUMENT) throw ApiError.badRequest(err.details);
        throw ApiError.serviceUnavailable('Seat service is unavailable, please try again');
      }
      const backoff = 100 * 2 ** attempt + Math.floor(Math.random() * 50);
      logger.warn(`SeatService.${method} ${grpc.status[err.code]}, retrying in ${backoff}ms`);
      await sleep(backoff);
    }
  }
}

module.exports = {
  lockSeats: ({ eventId, seatNos, userId }) => call('LockSeats', { eventId, seatNos, userId }),
  confirmSeats: ({ eventId, seatNos, userId, bookingId }) => call('ConfirmSeats', { eventId, seatNos, userId, bookingId }),
  releaseSeats: ({ eventId, seatNos, userId }) => call('ReleaseSeats', { eventId, seatNos, userId }),
  getSeatMap: ({ eventId }) => call('GetSeatMap', { eventId }),
  close: () => client.close(),
};
