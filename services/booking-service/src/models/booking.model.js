const { Schema, model } = require('mongoose');

const STATUSES = ['PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED', 'EXPIRED'];

const paymentSchema = new Schema(
  {
    status: { type: String, enum: ['CAPTURED', 'DECLINED', 'REFUNDED'] },
    reference: String,
    cardLast4: String,
    failureReason: String,
    processedAt: Date,
  },
  { _id: false },
);

const bookingSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    eventId: { type: String, required: true },
    // Snapshot of the event at booking time, so reads never depend on event-service.
    event: {
      title: String,
      venue: String,
      city: String,
      category: String,
      startsAt: Date,
    },
    seats: { type: [String], required: true },
    unitPrice: { type: Number, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: STATUSES, default: 'PENDING' },
    holdExpiresAt: { type: Date, required: true },
    payment: paymentSchema,
    failureReason: String,
    confirmedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

bookingSchema.index({ status: 1, holdExpiresAt: 1 });

const Booking = model('Booking', bookingSchema);

module.exports = Booking;
module.exports.STATUSES = STATUSES;
