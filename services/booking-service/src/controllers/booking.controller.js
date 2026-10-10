const bookingService = require('../services/booking.service');

async function list(req, res) {
  res.json({ data: await bookingService.listForUser(req.user.id) });
}

async function getById(req, res) {
  res.json({ booking: await bookingService.getById(req.user.id, req.params.id) });
}

async function create(req, res) {
  const booking = await bookingService.createHold(req.user.id, req.body);
  res.status(201).json({ booking });
}

async function pay(req, res) {
  const booking = await bookingService.pay(req.user.id, req.params.id, req.body);
  res.json({ booking });
}

async function cancel(req, res) {
  const booking = await bookingService.cancel(req.user.id, req.params.id);
  res.json({ booking });
}

module.exports = { list, getById, create, pay, cancel };
