const httpStatus = require("http-status");
const crypto = require("crypto");
const axios = require("axios");
const QRCode = require("qrcode");

const ApiError = require("../utils/ApiError");
const { Booking, Event, User } = require("../models");
const emailService = require("./email.service");

const generateBookingReference = () =>
  "BK-" + crypto.randomBytes(4).toString("hex").toUpperCase();

const generateQRCode = (text) =>
  QRCode.toDataURL(text, {
    errorCorrectionLevel: "H",
    type: "image/png",
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#FFFFFF" },
  });

const deductInventory = async (event, tickets) => {
  for (const t of tickets) {
    const type = event.ticketTypes.find((tt) => tt.name === t.ticketTypeName);
    if (!type)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Ticket type "${t.ticketTypeName}" not found`
      );
    if (type.quantity - type.sold < t.quantity) {
      throw new ApiError(
        httpStatus.CONFLICT,
        `Not enough tickets available for "${t.ticketTypeName}". Available: ${
          type.quantity - type.sold
        }`
      );
    }
    type.sold += t.quantity;
  }
  await event.save();
};

const buildLineItems = (event, tickets) => {
  if (!tickets || !tickets.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, "tickets array is required");
  }

  let totalAmount = 0;
  const lineItems = tickets.map(({ ticketTypeName, quantity }) => {
    const type = event.ticketTypes.find((t) => t.name === ticketTypeName);
    if (!type) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Ticket type "${ticketTypeName}" not found on this event`
      );
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Quantity for "${ticketTypeName}" must be a positive integer`
      );
    }
    const available = type.quantity - type.sold;
    if (quantity > available) {
      throw new ApiError(
        httpStatus.CONFLICT,
        `Only ${available} ticket(s) remaining for "${ticketTypeName}"`
      );
    }

    const subtotal = type.price * quantity;
    totalAmount += subtotal;

    return {
      ticketTypeName,
      quantity,
      unitPrice: type.price,
      subtotal,
    };
  });

  return { lineItems, totalAmount };
};

const createFreeBooking = async (userId, eventId, tickets) => {
  const [event, user] = await Promise.all([
    Event.findById(eventId),
    User.findById(userId),
  ]);

  if (!event) throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  if (event.status !== "published")
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Event is not open for bookings"
    );
  if (!event.isFreeEvent)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Use the paid booking endpoint for this event"
    );

  const { lineItems, totalAmount } = buildLineItems(event, tickets);
  if (totalAmount !== 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Free event ticket prices must all be 0"
    );
  }

  const bookingReference = generateBookingReference();
  const qrCodeImage = await generateQRCode(bookingReference);

  await deductInventory(event, lineItems);

  const booking = await Booking.create({
    user: userId,
    event: eventId,
    tickets: lineItems,
    totalAmount: 0,
    isFreeBooking: true,
    status: "confirmed",
    bookingReference,
    qrCodeImage,
  });

  emailService
    .sendBookingConfirmation({ user, event, booking })
    .then(() => {
      Booking.findByIdAndUpdate(booking._id, {
        confirmationEmailSentAt: new Date(),
      }).exec();
    })
    .catch((err) => console.error("[email] confirmation failed:", err.message));

  return booking.populate(["event", "user"]);
};

const initiatePaidBooking = async (userId, eventId, tickets) => {
  const [event, user] = await Promise.all([
    Event.findById(eventId),
    User.findById(userId),
  ]);

  if (!event) throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  if (event.status !== "published")
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Event is not open for bookings"
    );
  if (event.isFreeEvent)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Use the free booking endpoint for this event"
    );

  const { lineItems, totalAmount } = buildLineItems(event, tickets);

  const bookingReference = generateBookingReference();

  const booking = await Booking.create({
    user: userId,
    event: eventId,
    tickets: lineItems,
    totalAmount,
    isFreeBooking: false,
    status: "pending_payment",
    bookingReference,
    qrCodeImage: null,
  });

  // Initialise Paystack transaction
  const paystackRes = await axios.post(
    "https://api.paystack.co/transaction/initialize",
    {
      email: user.email,
      amount: Math.round(totalAmount * 100),
      currency: "NGN",
      reference: bookingReference,
      metadata: {
        bookingId: booking._id.toString(),
        eventId: eventId.toString(),
        userId: userId.toString(),
      },
      callback_url: `${process.env.APP_BASE_URL}/api/bookings/paystack/callback`,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!paystackRes.data.status) {
    await booking.deleteOne();
    throw new ApiError(
      httpStatus.BAD_GATEWAY,
      "Could not initiate Paystack payment"
    );
  }

  const { authorization_url, access_code, reference } = paystackRes.data.data;

  await Booking.findByIdAndUpdate(booking._id, {
    paystackReference: reference,
    paystackAccessCode: access_code,
  });

  return {
    bookingId: booking._id,
    bookingReference,
    totalAmount,
    currency: "NGN",
    authorizationUrl: authorization_url,
    accessCode: access_code,
  };
};

const confirmPaidBooking = async (reference) => {
  const verifyRes = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    }
  );

  if (!verifyRes.data.status || verifyRes.data.data.status !== "success") {
    throw new ApiError(httpStatus.PAYMENT_REQUIRED, "Payment not successful");
  }

  const booking = await Booking.findOne({ bookingReference: reference })
    .populate("event")
    .populate("user");

  if (!booking) throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  if (booking.status === "confirmed") return booking;

  const event = await Event.findById(booking.event._id ?? booking.event);
  if (!event)
    throw new ApiError(httpStatus.NOT_FOUND, "Associated event not found");

  await deductInventory(event, booking.tickets);

  const qrCodeImage = await generateQRCode(reference);

  booking.status = "confirmed";
  booking.qrCodeImage = qrCodeImage;
  await booking.save();

  emailService
    .sendBookingConfirmation({
      user: booking.user,
      event: booking.event,
      booking,
    })
    .then(() => {
      Booking.findByIdAndUpdate(booking._id, {
        confirmationEmailSentAt: new Date(),
      }).exec();
    })
    .catch((err) => console.error("[email] confirmation failed:", err.message));

  return booking;
};

const validateWebhookSignature = (rawBody, signature) => {
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY)
    .update(rawBody)
    .digest("hex");
  return hash === signature;
};

const getUserBookings = async (userId, options) => {
  const result = await Booking.paginate(
    { user: userId },
    { ...options, populate: ["event"] }
  );
  return result;
};

const getBookingById = async (bookingId, userId) => {
  const booking = await Booking.findById(bookingId).populate(["event", "user"]);
  if (!booking) throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  if (booking.user._id.toString() !== userId.toString()) {
    throw new ApiError(httpStatus.FORBIDDEN, "Access denied");
  }
  return booking;
};

module.exports = {
  createFreeBooking,
  initiatePaidBooking,
  confirmPaidBooking,
  validateWebhookSignature,
  getUserBookings,
  getBookingById,
};
