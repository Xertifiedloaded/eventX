const httpStatus = require("http-status");
const crypto = require("crypto");
const { Booking, User } = require("../models");
const ApiError = require("../utils/ApiError");
const emailService = require("./email.service");


const transferBooking = async (bookingId, currentUserId, recipientEmail) => {
  const booking = await Booking.findById(bookingId)
    .populate("user", "name email")
    .populate("event", "title startDate endDate organizer");

  if (!booking) {
    throw new ApiError(httpStatus.NOT_FOUND, "Booking not found");
  }

  if (booking.user._id.toString() !== currentUserId.toString()) {
    throw new ApiError(httpStatus.FORBIDDEN, "You do not own this booking");
  }

  if (booking.status !== "confirmed") {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Only confirmed bookings can be transferred. Current status: ${booking.status}`
    );
  }

  if (booking.checkedIn) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "This booking has already been checked in and cannot be transferred"
    );
  }

  const recipient = await User.findOne({ email: recipientEmail.toLowerCase().trim() });
  if (!recipient) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      `No account found with email: ${recipientEmail}`
    );
  }

  if (recipient._id.toString() === currentUserId.toString()) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You cannot transfer a booking to yourself"
    );
  }

  const previousOwner = {
    name:  booking.user.name,
    email: booking.user.email,
  };


  const QRCode = require("qrcode");
  const newReference =
    "BK-" + crypto.randomBytes(4).toString("hex").toUpperCase();
  const newQrCodeImage = await QRCode.toDataURL(newReference, {
    errorCorrectionLevel: "H",
    type: "image/png",
    width: 300,
    margin: 2,
    color: { dark: "#000000", light: "#FFFFFF" },
  });

  booking.user             = recipient._id;
  booking.bookingReference = newReference;
  booking.qrCodeImage      = newQrCodeImage;
  booking.transferredAt    = new Date();
  booking.transferredFrom  = previousOwner.email;
  await booking.save();


  emailService
    .sendTicketTransferNotification({
      previousOwner,
      newOwner: { name: recipient.name, email: recipient.email },
      event:    booking.event,
      booking,
    })
    .catch((err) => console.error("[email] transfer notification failed:", err.message));

  return {
    message:          "Booking successfully transferred",
    bookingReference: booking.bookingReference,
    transferredTo: {
      name:  recipient.name,
      email: recipient.email,
    },
    event: {
      title:     booking.event?.title,
      startDate: booking.event?.startDate,
    },
    tickets:     booking.tickets,
    totalAmount: booking.totalAmount,
  };
};

module.exports = {
  transferBooking,
};