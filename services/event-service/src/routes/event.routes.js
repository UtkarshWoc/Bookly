const { Router } = require('express');
const controller = require('../controllers/event.controller');
const validate = require('../middlewares/validate');
const { listEventsQuery } = require('../validators/event.validators');

const router = Router();

router.get('/', validate(listEventsQuery, 'query'), controller.list);
router.get('/categories', controller.categories);
router.get('/:id', controller.getById);

module.exports = router;
