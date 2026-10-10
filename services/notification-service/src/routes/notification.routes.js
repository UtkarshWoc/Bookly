const { Router } = require('express');
const controller = require('../controllers/notification.controller');
const requireUser = require('../middlewares/requireUser');

const router = Router();

router.use(requireUser);

router.get('/', controller.list);
router.post('/read-all', controller.markAllRead);
router.patch('/:id/read', controller.markRead);

module.exports = router;
