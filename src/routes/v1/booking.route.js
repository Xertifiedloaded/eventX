const express = require("express");
const router = express.Router();

const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const bookingValidation = require("../../validations/booking.validation");
const bookingController = require("../../controllers/booking.controller");

router.post("/paystack/webhook", bookingController.paystackWebhook);

router.get("/paystack/callback", bookingController.paystackCallback);

router.post(
  "/events/:eventId/free",
  auth(),
  validate(bookingValidation.bookTickets),
  bookingController.bookFreeEvent
);

router.post(
  "/events/:eventId/paid",
  auth(),
  validate(bookingValidation.bookTickets),
  bookingController.initiatePaidBooking
);

router.get("/my", auth(), bookingController.getMyBookings);

router.get("/:bookingId", auth(), bookingController.getBooking);

module.exports = router;
