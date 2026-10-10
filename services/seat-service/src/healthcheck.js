// Container health probe: a real GetSeatMap round-trip exercises gRPC, Redis and MongoDB.
const config = require('./config');
const { grpc, SeatService } = require('./config/grpc');

const client = new SeatService(`127.0.0.1:${config.port}`, grpc.credentials.createInsecure());
const deadline = new Date(Date.now() + 2000);

client.GetSeatMap({ eventId: '__healthcheck__' }, { deadline }, (err) => {
  client.close();
  process.exit(err ? 1 : 0);
});
