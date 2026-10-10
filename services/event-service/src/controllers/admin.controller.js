const eventService = require('../services/event.service');

async function create(req, res) {
  const event = await eventService.create(req.body, req.user.id);
  res.status(201).json({ event });
}

async function update(req, res) {
  const event = await eventService.update(req.params.id, req.body);
  res.json({ event });
}

async function remove(req, res) {
  await eventService.remove(req.params.id);
  res.status(204).end();
}

module.exports = { create, update, remove };
