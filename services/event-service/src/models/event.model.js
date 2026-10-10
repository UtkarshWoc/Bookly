const { Schema, model } = require('mongoose');

const CATEGORIES = ['Concert', 'Comedy', 'Theatre', 'Sports', 'Conference', 'Festival'];

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    venue: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    startsAt: { type: Date, required: true },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    imageUrl: { type: String, default: '' },
    // Seat grid: rows are lettered A.., seats numbered 1..seatsPerRow (e.g. "C12").
    layout: {
      rows: { type: Number, required: true, min: 1, max: 26 },
      seatsPerRow: { type: Number, required: true, min: 1, max: 40 },
    },
    createdBy: { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  },
);

eventSchema.virtual('capacity').get(function capacity() {
  return this.layout.rows * this.layout.seatsPerRow;
});

eventSchema.index({ startsAt: 1 });
eventSchema.index({ title: 'text', venue: 'text', city: 'text', description: 'text' });

const Event = model('Event', eventSchema);

module.exports = Event;
module.exports.CATEGORIES = CATEGORIES;
