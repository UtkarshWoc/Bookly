const { Router } = require('express');
const mongoose = require('mongoose');
const { isSubscribed } = require('../subscribers/booking.subscriber');
const notificationRoutes = require('./notification.routes');

const router = Router();

router.get('/health', (_req, res) => {
  const healthy = mongoose.connection.readyState === 1 && isSubscribed();
  res.status(healthy ? 200 : 503).json({ service: 'notification-service', status: healthy ? 'ok' : 'degraded' });
});

router.use('/notifications', notificationRoutes);

module.exports = router;
