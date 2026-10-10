const { Router } = require('express');
const controller = require('../controllers/availability.controller');

const router = Router();

// Public, uncached seat map (a REST facade over the internal gRPC GetSeatMap).
router.get('/:eventId', controller.getSeatMap);

module.exports = router;
