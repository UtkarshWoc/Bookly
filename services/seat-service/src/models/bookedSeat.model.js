const { Schema, model } = require('mongoose');

// A permanently sold seat. Redis only holds temporary locks; this is the source of truth for sales.
const bookedSeatSchema = new Schema(
  {
    eventId: { type: String, required: true },
    seatNo: { type: String, required: true },
    userId: { type: String, required: true },
    bookingId: { type: String, required: true },
  },
  { timestamps: true },
);

// The unique index is the last line of defence against double-selling a seat.
bookedSeatSchema.index({ eventId: 1, seatNo: 1 }, { unique: true });
bookedSeatSchema.index({ bookingId: 1 });

module.exports = model('BookedSeat', bookedSeatSchema);
