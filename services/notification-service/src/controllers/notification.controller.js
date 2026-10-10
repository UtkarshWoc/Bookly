const notificationService = require('../services/notification.service');

async function list(req, res) {
  res.json(await notificationService.listForUser(req.user.id));
}

async function markRead(req, res) {
  res.json({ notification: await notificationService.markRead(req.user.id, req.params.id) });
}

async function markAllRead(req, res) {
  res.json(await notificationService.markAllRead(req.user.id));
}

module.exports = { list, markRead, markAllRead };
