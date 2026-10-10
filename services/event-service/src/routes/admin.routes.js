const { Router } = require('express');
const controller = require('../controllers/admin.controller');
const requireAdmin = require('../middlewares/requireAdmin');
const validate = require('../middlewares/validate');
const { createEventSchema, updateEventSchema } = require('../validators/event.validators');

const router = Router();

router.use(requireAdmin);
router.post('/events', validate(createEventSchema), controller.create);
router.patch('/events/:id', validate(updateEventSchema), controller.update);
router.delete('/events/:id', controller.remove);

module.exports = router;
