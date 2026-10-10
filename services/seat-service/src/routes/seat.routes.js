const { SeatService } = require('../config/grpc');
const controller = require('../controllers/seat.controller');

// gRPC "routing": binds each RPC declared in seat.proto to its controller handler.
function registerSeatRoutes(server) {
  server.addService(SeatService.service, {
    LockSeats: controller.lockSeats,
    ConfirmSeats: controller.confirmSeats,
    ReleaseSeats: controller.releaseSeats,
    GetSeatMap: controller.getSeatMap,
  });
}

module.exports = registerSeatRoutes;
