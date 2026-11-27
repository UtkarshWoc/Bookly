const crypto = require('crypto');
const config = require('../config');

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const rawVal = part.slice(idx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(rawVal);
    } catch {
      cookies[key] = rawVal;
    }
  }
  return cookies;
}

function isSecureRequest(req) {
  if (config.cookie.secure === 'true') return true;
  if (config.cookie.secure === 'false') return false;
  return Boolean(req.secure || req.get('x-forwarded-proto') === 'https');
}

function setAuthCookies(req, res, { token, expiresAt }) {
  const maxAge = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const secure = isSecureRequest(req);
  const csrfToken = crypto.randomBytes(24).toString('hex');

  res.cookie(config.cookie.tokenName, token, {
    httpOnly: true,
    sameSite: config.cookie.sameSite,
    secure,
    path: '/',
    maxAge,
  });

  // Double-submit CSRF token: readable by same-origin JS so it can echo X-CSRF-Token.
  res.cookie(config.cookie.csrfName, csrfToken, {
    httpOnly: false,
    sameSite: config.cookie.sameSite,
    secure,
    path: '/',
    maxAge,
  });
}

function clearAuthCookies(req, res) {
  const secure = isSecureRequest(req);
  res.clearCookie(config.cookie.tokenName, {
    httpOnly: true,
    sameSite: config.cookie.sameSite,
    secure,
    path: '/',
  });
  res.clearCookie(config.cookie.csrfName, {
    httpOnly: false,
    sameSite: config.cookie.sameSite,
    secure,
    path: '/',
  });
}

function verifyCsrf(req) {
  const cookies = parseCookies(req.headers.cookie);
  const cookieToken = cookies[config.cookie.csrfName];
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken) return false;
  const a = Buffer.from(cookieToken, 'utf8');
  const b = Buffer.from(headerToken, 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { parseCookies, isSecureRequest, setAuthCookies, clearAuthCookies, verifyCsrf };
