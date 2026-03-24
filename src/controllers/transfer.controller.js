const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const transferService = require("../services/transfer.service");

const transferBooking = catchAsync(async (req, res) => {
  const { bookingId } = req.params;
  const { recipientEmail } = req.body;

  const result = await transferService.transferBooking(
    bookingId,
    req.user.id,
    recipientEmail
  );

  res.status(httpStatus.OK).json(result);
});

module.exports = {
  transferBooking,
};