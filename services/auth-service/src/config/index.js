const path = require('path');

// Single root-level .env. In Docker the variables are injected by compose,
// so a missing file here is expected and harmless.
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env'), quiet: true });

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

module.exports = Object.freeze({
  serviceName: 'auth-service',
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.AUTH_SERVICE_PORT || 8001),
  mongo: {
    uri: required('MONGO_URI'),
    dbName: process.env.AUTH_DB_NAME || 'bookly_auth',
  },
  redisUrl: required('AUTH_REDIS_URL'),
  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 10),
  admin: {
    name: process.env.ADMIN_NAME || 'Bookly Admin',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  },
});
