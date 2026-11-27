const config = require('../config');
const ApiError = require('../utils/ApiError');
const tokenService = require('../services/token.service');
const { parseCookies, verifyCsrf } = require('../utils/cookies');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function extractBearer(header) {
  if (!header) return null;
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

// Verifies the JWT (from Authorization header or httpOnly cookie) and enforces
// double-submit CSRF verification for cookie-authenticated mutating requests.
async function authenticate(req, _res, next) {
  const bearer = extractBearer(req.headers.authorization);
  if (bearer) {
    req.auth = await tokenService.verify(bearer);
    req.authSource = 'bearer';
    return next();
  }

  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[config.cookie.tokenName];
  if (!cookieToken) return next(ApiError.unauthorized('Missing authentication token'));

  req.auth = await tokenService.verify(cookieToken);
  req.authSource = 'cookie';

  // When called via nginx auth_request (/verify), X-Original-Method holds the client's HTTP method.
  const effectiveMethod = (req.get('x-original-method') || req.method).toUpperCase();
  if (!SAFE_METHODS.has(effectiveMethod) && !verifyCsrf(req)) {
    return next(ApiError.forbidden('CSRF token missing or invalid'));
  }
  return next();
}

module.exports = authenticate;
