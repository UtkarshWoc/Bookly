const eventService = require('../services/event.service');

async function list(req, res) {
  res.json(await eventService.list(req.validatedQuery));
}

async function getById(req, res) {
  const { event, cache } = await eventService.getById(req.params.id);
  res.set('X-Cache', cache);
  res.json({ event });
}

function categories(_req, res) {
  res.json({ categories: eventService.categories });
}

module.exports = { list, getById, categories };
