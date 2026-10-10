const { Router } = require('express');
const mongoose = require('mongoose');
const redis = require('../config/redis');
const eventRoutes = require('./event.routes');
const adminRoutes = require('./admin.routes');

const router = Router();

router.get('/health', (_req, res) => {
  const healthy = mongoose.connection.readyState === 1 && redis.status === 'ready';
  res.status(healthy ? 200 : 503).json({ service: 'event-service', status: healthy ? 'ok' : 'degraded' });
});

router.use('/events', eventRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
