const { Router } = require('express');
const mongoose = require('mongoose');
const redis = require('../config/redis');
const bookingRoutes = require('./booking.routes');
const availabilityRoutes = require('./availability.routes');

const router = Router();

router.get('/health', (_req, res) => {
  const healthy = mongoose.connection.readyState === 1 && redis.status === 'ready';
  res.status(healthy ? 200 : 503).json({ service: 'booking-service', status: healthy ? 'ok' : 'degraded' });
});

router.use('/bookings', bookingRoutes);
router.use('/availability', availabilityRoutes);

module.exports = router;
