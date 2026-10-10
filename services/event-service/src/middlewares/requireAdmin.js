const ApiError = require('../utils/ApiError');

// Identity is established by the api-gateway (auth_request) and forwarded as headers.
// This service is not reachable from outside the Docker network, so the headers are trusted.
function requireAdmin(req, _res, next) {
  const userId = req.get('X-User-Id');
  if (!userId) return next(ApiError.unauthorized('Authentication required'));
  if (req.get('X-User-Role') !== 'admin') return next(ApiError.forbidden('Admin role required'));
  req.user = { id: userId, role: 'admin' };
  next();
}

module.exports = requireAdmin;
