const ApiError = require('../utils/ApiError');

// Identity is established by the api-gateway (auth_request) and forwarded as headers.
// This service is not reachable from outside the Docker network, so the headers are trusted.
function requireUser(req, _res, next) {
  const userId = req.get('X-User-Id');
  if (!userId) return next(ApiError.unauthorized('Authentication required'));
  req.user = { id: userId, role: req.get('X-User-Role') || 'user' };
  next();
}

module.exports = requireUser;
