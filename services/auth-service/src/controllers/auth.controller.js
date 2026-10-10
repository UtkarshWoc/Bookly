const authService = require('../services/auth.service');
const tokenService = require('../services/token.service');

async function register(req, res) {
  const result = await authService.register(req.body);
  res.status(201).json(result);
}

async function login(req, res) {
  const result = await authService.login(req.body);
  res.json(result);
}

async function logout(req, res) {
  const revokedForSeconds = await tokenService.revoke(req.auth);
  res.json({ message: 'Logged out', revokedForSeconds });
}

async function me(req, res) {
  const user = await authService.getProfile(req.auth.sub);
  res.json({ user });
}

// Called by the gateway's auth_request. Identity travels downstream as headers,
// so no other service ever has to look at a JWT.
async function verify(req, res) {
  res.set({
    'X-User-Id': req.auth.sub,
    'X-User-Role': req.auth.role,
    'X-User-Email': req.auth.email,
  });
  res.json({
    valid: true,
    userId: req.auth.sub,
    role: req.auth.role,
    expiresAt: new Date(req.auth.exp * 1000).toISOString(),
  });
}

module.exports = { register, login, logout, me, verify };
