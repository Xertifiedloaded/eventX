const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const verificationService = require("../services/verification.service");

const verifyBooking = catchAsync(async (req, res) => {
  const { bookingReference } = req.body;

  const result = await verificationService.verifyBooking(
    bookingReference,
    req.user.id
  );

  res.status(httpStatus.OK).json(result);
});



const lookupBooking = catchAsync(async (req, res) => {
  const { bookingReference } = req.params;

  const result = await verificationService.lookupBooking(
    bookingReference,
    req.user.id
  );

  res.status(httpStatus.OK).json(result);
});

module.exports = {
  verifyBooking,
  lookupBooking,
}