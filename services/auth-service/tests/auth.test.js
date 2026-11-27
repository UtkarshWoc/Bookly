const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

process.env.MONGO_URI = 'mongodb://localhost:27017';
process.env.AUTH_REDIS_URL = 'redis://localhost:6379/0';
process.env.JWT_SECRET = 'unit-test-secret-with-plenty-of-length-123456';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '4';

// Stub Redis before loading token/auth services so no live socket is opened.
const store = new Map();
const fakeRedis = {
  async exists(key) {
    return store.has(key) ? 1 : 0;
  },
  async set(key, value) {
    store.set(key, value);
    return 'OK';
  },
};
require.cache[require.resolve('../src/config/redis')] = {
  id: require.resolve('../src/config/redis'),
  filename: require.resolve('../src/config/redis'),
  loaded: true,
  exports: fakeRedis,
};

const tokenService = require('../src/services/token.service');
const authService = require('../src/services/auth.service');
const authenticate = require('../src/middlewares/authenticate');
const { parseCookies, setAuthCookies, clearAuthCookies, verifyCsrf, isSecureRequest } = require('../src/utils/cookies');
const User = require('../src/models/user.model');
const { registerSchema, loginSchema } = require('../src/validators/auth.validators');

describe('auth.validators', () => {
  it('normalizes email and validates register payload', () => {
    const parsed = registerSchema.parse({
      name: '  Ada Lovelace ',
      email: '  ADA@Example.COM ',
      password: 'password123',
    });
    assert.equal(parsed.name, 'Ada Lovelace');
    assert.equal(parsed.email, 'ada@example.com');
  });

  it('rejects short password on register', () => {
    const res = registerSchema.safeParse({ name: 'Ada', email: 'ada@test.dev', password: 'short' });
    assert.equal(res.success, false);
  });

  it('requires password on login', () => {
    const res = loginSchema.safeParse({ email: 'ada@test.dev', password: '' });
    assert.equal(res.success, false);
  });
});

describe('token.service', () => {
  beforeEach(() => store.clear());

  it('issues, verifies and revokes a JWT via Redis blacklist', async () => {
    const { token, expiresAt } = tokenService.issue({
      id: 'user-1',
      role: 'user',
      email: 'ada@test.dev',
      name: 'Ada',
    });
    assert.ok(token);
    assert.ok(new Date(expiresAt).getTime() > Date.now());

    const claims = await tokenService.verify(token);
    assert.equal(claims.sub, 'user-1');
    assert.equal(claims.role, 'user');
    assert.ok(claims.jti);

    const ttl = await tokenService.revoke(claims);
    assert.ok(ttl > 0);
    assert.equal(store.has(`jwt:blacklist:${claims.jti}`), true);

    await assert.rejects(() => tokenService.verify(token), { status: 401, message: 'Token has been revoked' });
  });

  it('rejects tampered tokens', async () => {
    await assert.rejects(() => tokenService.verify('not.a.valid.jwt'), { status: 401, message: 'Invalid token' });
  });
});

describe('auth.service', () => {
  it('rejects duplicate email registration with 409', async (t) => {
    t.mock.method(User, 'exists', async () => ({ _id: '1' }));
    await assert.rejects(
      () => authService.register({ name: 'Ada', email: 'ada@test.dev', password: 'password123' }),
      { status: 409 },
    );
  });

  it('registers a new user and issues a token', async (t) => {
    t.mock.method(User, 'exists', async () => null);
    t.mock.method(User, 'create', async (doc) => ({
      id: '507f1f77bcf86cd799439011',
      ...doc,
      role: 'user',
      toJSON() {
        return { id: this.id, name: this.name, email: this.email, role: this.role };
      },
    }));

    const result = await authService.register({ name: 'Ada', email: 'ada@test.dev', password: 'password123' });
    assert.equal(result.user.email, 'ada@test.dev');
    assert.ok(result.token);
  });

  it('rejects unknown email login with 401 using timing-equalizer hash', async (t) => {
    t.mock.method(User, 'findOne', () => ({ select: async () => null }));
    await assert.rejects(
      () => authService.login({ email: 'nobody@test.dev', password: 'password123' }),
      { status: 401, message: 'Invalid email or password' },
    );
  });
});

describe('httpOnly cookie auth & CSRF protection', () => {
  beforeEach(() => store.clear());

  it('sets httpOnly auth cookie + readable CSRF cookie and marks Secure behind HTTPS proxy', () => {
    const setCookies = [];
    const req = { secure: false, get: (h) => (h.toLowerCase() === 'x-forwarded-proto' ? 'https' : undefined) };
    const res = {
      cookie(name, value, opts) {
        setCookies.push({ name, value, opts });
      },
      clearCookie(name, opts) {
        setCookies.push({ cleared: name, opts });
      },
    };

    assert.equal(isSecureRequest(req), true);
    setAuthCookies(req, res, { token: 'jwt.val', expiresAt: new Date(Date.now() + 60_000).toISOString() });
    const authCookie = setCookies.find((c) => c.name === 'bookly_token');
    const csrfCookie = setCookies.find((c) => c.name === 'bookly_csrf');
    assert.equal(authCookie.opts.httpOnly, true);
    assert.equal(authCookie.opts.secure, true);
    assert.equal(csrfCookie.opts.httpOnly, false);

    clearAuthCookies(req, res);
    assert.equal(setCookies.some((c) => c.cleared === 'bookly_token'), true);
  });

  it('parses cookies and enforces double-submit CSRF on cookie-authenticated mutations', async () => {
    const { token } = tokenService.issue({ id: 'u-cookie', role: 'user', email: 'c@test.dev', name: 'C' });
    const csrf = 'csrf-random-token-123456';
    const cookieHeader = `bookly_token=${encodeURIComponent(token)}; bookly_csrf=${csrf}`;

    assert.equal(parseCookies(cookieHeader).bookly_token, token);
    assert.equal(
      verifyCsrf({ headers: { cookie: cookieHeader }, get: (h) => (h.toLowerCase() === 'x-csrf-token' ? csrf : '') }),
      true,
    );

    // Safe GET through /verify needs no X-CSRF-Token.
    const getReq = {
      method: 'GET',
      headers: { cookie: cookieHeader },
      get: (h) => (h.toLowerCase() === 'x-original-method' ? 'GET' : undefined),
    };
    await new Promise((resolve, reject) => authenticate(getReq, {}, (err) => (err ? reject(err) : resolve())));
    assert.equal(getReq.auth.sub, 'u-cookie');

    // Mutating X-Original-Method without X-CSRF-Token is rejected with 403.
    const missingCsrfReq = {
      method: 'GET',
      headers: { cookie: cookieHeader },
      get: (h) => (h.toLowerCase() === 'x-original-method' ? 'POST' : undefined),
    };
    const err = await new Promise((resolve) => authenticate(missingCsrfReq, {}, resolve));
    assert.equal(err.status, 403);

    // Mutating X-Original-Method with matching X-CSRF-Token succeeds.
    const validCsrfReq = {
      method: 'GET',
      headers: { cookie: cookieHeader },
      get: (h) => {
        const key = h.toLowerCase();
        if (key === 'x-original-method') return 'POST';
        if (key === 'x-csrf-token') return csrf;
        return undefined;
      },
    };
    await new Promise((resolve, reject) => authenticate(validCsrfReq, {}, (e) => (e ? reject(e) : resolve())));
    assert.equal(validCsrfReq.auth.sub, 'u-cookie');
  });
});
