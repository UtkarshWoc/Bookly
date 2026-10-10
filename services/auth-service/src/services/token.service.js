const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');
const redis = require('../config/redis');
const ApiError = require('../utils/ApiError');

const blacklistKey = (jti) => `jwt:blacklist:${jti}`;

function issue(user) {
  const jti = crypto.randomUUID();
  const token = jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.name },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn, jwtid: jti },
  );
  const { exp } = jwt.decode(token);
  return { token, expiresAt: new Date(exp * 1000).toISOString() };
}

async function verify(token) {
  let claims;
  try {
    claims = jwt.verify(token, config.jwt.secret);
  } catch (err) {
    throw ApiError.unauthorized(err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token');
  }
  if (await redis.exists(blacklistKey(claims.jti))) {
    throw ApiError.unauthorized('Token has been revoked');
  }
  return claims;
}

// Blacklist the token only for as long as it would otherwise remain valid.
async function revoke(claims) {
  const ttl = claims.exp - Math.floor(Date.now() / 1000);
  if (ttl > 0) await redis.set(blacklistKey(claims.jti), '1', 'EX', ttl);
  return Math.max(ttl, 0);
}

module.exports = { issue, verify, revoke };
