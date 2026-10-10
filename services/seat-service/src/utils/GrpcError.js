const { status } = require('@grpc/grpc-js');

// An error that carries a gRPC status code back to the client.
class GrpcError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }

  static invalidArgument(message) { return new GrpcError(status.INVALID_ARGUMENT, message); }
  static internal(message = 'Internal error') { return new GrpcError(status.INTERNAL, message); }
}

module.exports = GrpcError;
