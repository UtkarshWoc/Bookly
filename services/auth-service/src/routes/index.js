const { Router } = require('express');
const mongoose = require('mongoose');
const redis = require('../config/redis');
const authRoutes = require('./auth.routes');

const router = Router();

router.get('/health', (_req, res) => {
  const healthy = mongoose.connection.readyState === 1 && redis.status === 'ready';
  res.status(healthy ? 200 : 503).json({ service: 'auth-service', status: healthy ? 'ok' : 'degraded' });
});

router.use('/', authRoutes);

module.exports = router;
