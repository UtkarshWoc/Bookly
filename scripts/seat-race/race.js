#!/usr/bin/env node
/**
 * Double-booking race test.
 *
 * Sends N concurrent LockSeats requests for the SAME seat, each from a different user,
 * through the gateway's gRPC proxy (127.0.0.1:GRPC_GATEWAY_PORT -> seat-service).
 * Exactly one request must win; the rest must report the seat as taken.
 *
 * Usage: node race.js [concurrency=50] [seat=Z9]
 */
const path = require('path');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

const CONCURRENCY = Number(process.argv[2] || 50);
const SEAT = process.argv[3] || 'Z9';
const ADDRESS = process.env.SEAT_GRPC_ADDR || `127.0.0.1:${process.env.GRPC_GATEWAY_PORT || 9090}`;
const EVENT_ID = `race-${Date.now()}`;

const definition = protoLoader.loadSync(path.resolve(__dirname, '../../proto/seat.proto'), {
  keepCase: false,
  defaults: true,
});
const { SeatService } = grpc.loadPackageDefinition(definition).bookly.seat.v1;
const client = new SeatService(ADDRESS, grpc.credentials.createInsecure());

const call = (method, request) =>
  new Promise((resolve, reject) => {
    client[method](request, { deadline: new Date(Date.now() + 5000) }, (err, res) => (err ? reject(err) : resolve(res)));
  });

async function main() {
  console.log(`Racing ${CONCURRENCY} users for seat ${SEAT} of event ${EVENT_ID} via ${ADDRESS}\n`);
  const started = Date.now();

  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, i) =>
      call('LockSeats', { eventId: EVENT_ID, seatNos: [SEAT], userId: `racer-${i}` })
        .then((res) => ({ user: `racer-${i}`, ...res }))
        .catch((err) => ({ user: `racer-${i}`, error: err.message })),
    ),
  );

  const winners = results.filter((r) => r.success);
  const losers = results.filter((r) => r.success === false);
  const errors = results.filter((r) => r.error);

  console.log(`  winners : ${winners.length} ${winners.map((w) => `(${w.user}, hold ${w.ttlSeconds}s)`).join(' ')}`);
  console.log(`  rejected: ${losers.length}`);
  console.log(`  errors  : ${errors.length}${errors.length ? ` — ${errors[0].error}` : ''}`);
  console.log(`  elapsed : ${Date.now() - started}ms\n`);

  if (winners.length === 1) {
    await call('ReleaseSeats', { eventId: EVENT_ID, seatNos: [SEAT], userId: winners[0].user });
    console.log('PASS — exactly one user acquired the seat (lock released afterwards).');
  } else {
    console.log('FAIL — expected exactly one winner.');
    process.exitCode = 1;
  }
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
