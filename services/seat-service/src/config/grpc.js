const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const config = require('./index');

// proto-loader generates the service stubs from the .proto contract at runtime.
// Field names are camelCased in JS (event_id -> eventId).
const packageDefinition = protoLoader.loadSync(config.protoPath, {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const { SeatService } = grpc.loadPackageDefinition(packageDefinition).bookly.seat.v1;

module.exports = { grpc, SeatService };
