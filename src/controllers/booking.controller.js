const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const pick = require("../utils/pick");
const ApiError = require("../utils/ApiError");
const bookingService = require("../services/booking.service");

const bookFreeEvent = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const { tickets } = req.body; 

  const booking = await bookingService.createFreeBooking(
    req.user.id,
    eventId,
    tickets
  );

  res.status(httpStatus.CREATED).json({
    message: "Booking confirmed!",
    bookingReference: booking.bookingReference,
    status: booking.status,
    totalAmount: 0,
    currency: "NGN",
    booking,
  });
});

const initiatePaidBooking = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const { tickets } = req.body;

  const result = await bookingService.initiatePaidBooking(
    req.user.id,
    eventId,
    tickets
  );

  res.status(httpStatus.CREATED).json({
    message: "Payment session created. Redirect user to authorizationUrl.",
    ...result,
  });
});

const paystackCallback = catchAsync(async (req, res) => {
  const { reference, trxref } = req.query;
  const ref = reference || trxref;

  if (!ref)
    throw new ApiError(httpStatus.BAD_REQUEST, "Missing payment reference");

  const booking = await bookingService.confirmPaidBooking(ref);

  res.json({
    message: "Payment verified. Booking confirmed!",
    bookingReference: booking.bookingReference,
    status: booking.status,
  });
});

const paystackWebhook = catchAsync(async (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  const isValid = bookingService.validateWebhookSignature(
    req.rawBody || req.body,
    signature
  );
  if (!isValid) {
    return res
      .status(httpStatus.UNAUTHORIZED)
      .json({ message: "Invalid signature" });
  }

  const event = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

  if (event.event === "charge.success") {
    const { reference } = event.data;
    try {
      await bookingService.confirmPaidBooking(reference);
    } catch (err) {
      console.error("[webhook] confirmPaidBooking error:", err.message);
    }
  }

  res.status(httpStatus.OK).json({ received: true });
});

const getMyBookings = catchAsync(async (req, res) => {
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await bookingService.getUserBookings(req.user.id, options);
  res.json(result);
});

const getBooking = catchAsync(async (req, res) => {
  const booking = await bookingService.getBookingById(
    req.params.bookingId,
    req.user.id
  );
  res.json(booking);
});

module.exports = {
  bookFreeEvent,
  initiatePaidBooking,
  paystackCallback,
  paystackWebhook,
  getMyBookings,
  getBooking,
};
