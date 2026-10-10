const bookingService = require('../services/booking.service');

async function getSeatMap(req, res) {
  res.set('Cache-Control', 'no-store');
  res.json(await bookingService.getAvailability(req.params.eventId));
}

module.exports = { getSeatMap };
