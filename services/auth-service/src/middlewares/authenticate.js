const ApiError = require('../utils/ApiError');
const tokenService = require('../services/token.service');

function extractBearer(header) {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

// Verifies the bearer token (signature, expiry, blacklist) and exposes its claims on req.auth.
async function authenticate(req, _res, next) {
  const token = extractBearer(req.headers.authorization);
  if (!token) return next(ApiError.unauthorized('Missing bearer token'));
  req.auth = await tokenService.verify(token);
  next();
}

module.exports = authenticate;
