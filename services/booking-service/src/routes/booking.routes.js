const { Router } = require('express');
const controller = require('../controllers/booking.controller');
const requireUser = require('../middlewares/requireUser');
const idempotency = require('../middlewares/idempotency');
const validate = require('../middlewares/validate');
const { createBookingSchema, payBookingSchema } = require('../validators/booking.validators');

const router = Router();

router.use(requireUser);

router.get('/', controller.list);
router.post('/', validate(createBookingSchema), idempotency, controller.create);
router.get('/:id', controller.getById);
router.post('/:id/pay', validate(payBookingSchema), idempotency, controller.pay);
router.post('/:id/cancel', idempotency, controller.cancel);

module.exports = router;
