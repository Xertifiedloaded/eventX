const httpStatus = require("http-status");
const { Booking } = require("../models");
const ApiError = require("../utils/ApiError");

const verifyBooking = async (bookingReference, organizerId) => {
  if (!bookingReference || typeof bookingReference !== "string") {
    throw new ApiError(httpStatus.BAD_REQUEST, "bookingReference is required");
  }

  const ref = bookingReference.trim().toUpperCase();

  const booking = await Booking.findOne({ bookingReference: ref })
    .populate("user", "name email phone")
    .populate("event", "title startDate endDate organizer location");

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  const eventOrganizerId =
    booking.event?.organizer?.toString() ?? booking.event?.organizer;

  if (eventOrganizerId !== organizerId.toString()) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not the organizer of this event"
    );
  }

  if (booking.status !== "confirmed") {
    throw new ApiError(
      httpStatus.UNPROCESSABLE_ENTITY,
      `Booking is not confirmed. Current status: ${booking.status}`
    );
  }

  if (booking.checkedIn) {
    throw new ApiError(
      httpStatus.CONFLICT,
      `Booking already checked in at ${booking.checkedInAt.toISOString()}`
    );
  }

  booking.checkedIn = true;
  booking.checkedInAt = new Date();
  await booking.save();

  const updated = await Booking.findById(booking._id)
    .populate("user", "name email phone")
    .populate("event", "title startDate endDate location");

  return {
    valid: true,
    message: "Check-in successful",
    bookingReference: updated.bookingReference,
    checkedInAt: updated.checkedInAt,
    attendee: {
      name: updated.user?.name,
      email: updated.user?.email,
      phone: updated.user?.phone ?? null,
    },
    event: {
      title: updated.event?.title,
      startDate: updated.event?.startDate,
      endDate: updated.event?.endDate,
      location: updated.event?.location ?? null,
    },
    tickets: updated.tickets,
    totalAmount: updated.totalAmount,
    isFreeBooking: updated.isFreeBooking,
  };
};

const lookupBooking = async (bookingReference, organizerId) => {
  if (!bookingReference || typeof bookingReference !== "string") {
    throw new ApiError(httpStatus.BAD_REQUEST, "bookingReference is required");
  }

  const ref = bookingReference.trim().toUpperCase();

  const booking = await Booking.findOne({ bookingReference: ref })
    .populate("user", "name email phone")
    .populate("event", "title startDate endDate organizer location");

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  const eventOrganizerId =
    booking.event?.organizer?.toString() ?? booking.event?.organizer;

  if (eventOrganizerId !== organizerId.toString()) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You are not the organizer of this event"
    );
  }

  return {
    bookingReference: booking.bookingReference,
    status: booking.status,
    checkedIn: booking.checkedIn ?? false,
    checkedInAt: booking.checkedInAt ?? null,
    attendee: {
      name: booking.user?.name,
      email: booking.user?.email,
      phone: booking.user?.phone ?? null,
    },
    event: {
      title: booking.event?.title,
      startDate: booking.event?.startDate,
      endDate: booking.event?.endDate,
      location: booking.event?.location ?? null,
    },
    tickets: booking.tickets,
    totalAmount: booking.totalAmount,
    isFreeBooking: booking.isFreeBooking,
  };
};

module.exports = {
  verifyBooking,
  lookupBooking,
};