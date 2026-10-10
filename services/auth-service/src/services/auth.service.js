const config = require('../config');
const User = require('../models/user.model');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const tokenService = require('./token.service');

async function register({ name, email, password }) {
  if (await User.exists({ email })) throw ApiError.conflict('An account with this email already exists');
  const passwordHash = await User.hashPassword(password, config.bcryptRounds);
  const user = await User.create({ name, email, passwordHash });
  return { user: user.toJSON(), ...tokenService.issue(user) };
}

async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Invalid email or password');
  }
  return { user: user.toJSON(), ...tokenService.issue(user) };
}

async function getProfile(userId) {
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound('User not found');
  return user.toJSON();
}

// Creates the bootstrap admin account from .env if it does not exist yet.
async function ensureAdminUser() {
  const { name, email, password } = config.admin;
  if (!email || !password) return;
  if (await User.exists({ email: email.toLowerCase() })) return;
  const passwordHash = await User.hashPassword(password, config.bcryptRounds);
  await User.create({ name, email, passwordHash, role: 'admin' });
  logger.info(`Bootstrap admin created: ${email}`);
}

module.exports = { register, login, getProfile, ensureAdminUser };
