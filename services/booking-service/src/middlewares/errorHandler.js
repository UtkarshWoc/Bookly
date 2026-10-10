const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

function notFound(req, _res, next) {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  const status = err instanceof ApiError ? err.status : err.status || 500;
  if (status >= 500) logger.error(err.stack || err.message);
  res.status(status).json({
    error: {
      status,
      message: err instanceof ApiError ? err.message : 'Internal server error',
      ...(err.details && { details: err.details }),
    },
  });
}

module.exports = { notFound, errorHandler };
