const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const ticketTypeSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    price:    { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    sold:     { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    organizer: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    category: {
      type: String,
      enum: ['music', 'sports', 'technology', 'business', 'arts', 'education', 'other'],
      required: true,
      index: true,
    },
    coverImage: {
      type: String,
      required: true,
      trim: true,
    },
    startDateTime: { type: Date, required: true },
    endDateTime:   { type: Date, required: true },

    venueName: {
      type: String,
      trim: true,
      required: function () { return !this.isOnlineEvent; },
    },
    location: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Location',
      default: null,
    },
    isOnlineEvent: { type: Boolean, default: false },
    onlineEventLink: {
      type: String,
      trim: true,
      required: function () { return this.isOnlineEvent; },
    },

    isFreeEvent: { type: Boolean, default: false },

    ticketTypes: {
      type: [ticketTypeSchema],
      default: [],
    },

    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },
    status: {
      type: String,
      enum: ['draft', 'published', 'cancelled', 'completed'],
      default: 'draft',
      index: true,
    },
  },
  { timestamps: true }
);


eventSchema.index({ startDateTime: 1 });
eventSchema.index({ organizer: 1, status: 1 });
eventSchema.index({ category: 1, visibility: 1, status: 1 });


eventSchema.virtual('totalCapacity').get(function () {
  return this.ticketTypes.reduce((sum, t) => sum + t.quantity, 0);
});

eventSchema.virtual('availableTickets').get(function () {
  return this.ticketTypes.reduce((sum, t) => sum + (t.quantity - t.sold), 0);
});


eventSchema.pre('validate', function () {
  if (this.startDateTime && this.endDateTime && this.endDateTime <= this.startDateTime) {
    this.invalidate('endDateTime', 'endDateTime must be after startDateTime', this.endDateTime);
  }

  if (this.status === 'draft') return;

  const tickets = this.ticketTypes ?? [];

  if (this.isFreeEvent) {
    const allFree = tickets.every((t) => Number(t.price) === 0);
    if (!allFree) {
      this.invalidate(
        'ticketTypes',
        'All ticket types must have a price of 0 for a free event.',
        tickets
      );
    }
  } else {
    if (tickets.length === 0) {
      this.invalidate(
        'ticketTypes',
        'A paid event must have at least one ticket type.',
        tickets
      );
    }
    const validPrices = tickets.every((t) => Number(t.price) >= 0);
    if (!validPrices) {
      this.invalidate(
        'ticketTypes',
        'All ticket type prices must be 0 or greater.',
        tickets
      );
    }
  }
});


eventSchema.plugin(toJSON);
eventSchema.plugin(paginate);

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;