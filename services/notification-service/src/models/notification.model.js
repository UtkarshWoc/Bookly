const { Schema, model } = require('mongoose');

const TYPES = ['booking.confirmed', 'booking.failed', 'booking.cancelled'];

const notificationSchema = new Schema(
  {
    userId: { type: String, required: true },
    type: { type: String, enum: TYPES, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    bookingId: String,
    eventId: String,
    read: { type: Boolean, default: false },
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

notificationSchema.index({ userId: 1, createdAt: -1 });

const Notification = model('Notification', notificationSchema);

module.exports = Notification;
module.exports.TYPES = TYPES;
