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
