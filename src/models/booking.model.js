const mongoose = require("mongoose");
const { toJSON, paginate } = require("./plugins");

const bookedTicketSchema = new mongoose.Schema(
  {
    ticketTypeName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    event: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    tickets: {
      type: [bookedTicketSchema],
      required: true,
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: "At least one ticket must be booked.",
      },
    },

    totalAmount: { type: Number, required: true, min: 0 },
    isFreeBooking: { type: Boolean, default: false },

    paystackReference: { type: String, default: null, index: true },
    paystackAccessCode: { type: String, default: null },

    status: {
      type: String,
      enum: ["pending_payment", "confirmed", "cancelled", "refunded"],
      default: "pending_payment",
      index: true,
    },

    bookingReference: { type: String, required: true }, 
    qrCodeImage: { type: String, default: null },

    confirmationEmailSentAt: { type: Date, default: null },

    checkedIn: { type: Boolean, default: false },
    checkedInAt: { type: Date, default: null },
    transferredAt: { type: Date, default: null },
    transferredFrom: { type: String, default: null },
  },
  { timestamps: true }
);

bookingSchema.index({ user: 1, event: 1 });
bookingSchema.index({ bookingReference: 1 }, { unique: true }); 

bookingSchema.plugin(toJSON);
bookingSchema.plugin(paginate);

const Booking = mongoose.model("Booking", bookingSchema);
module.exports = Booking;