const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const pick = require("../utils/pick");
const attendeeService = require("../services/attendee.service");


const getEventAttendees = catchAsync(async (req, res) => {
  const { eventId } = req.params;
  const filter = pick(req.query, ["checkedIn"]);
  const options = pick(req.query, ["page", "limit", "sortBy"]);

  const result = await attendeeService.getEventAttendees(
    eventId,
    req.user.id,
    filter,
    options
  );

  res.status(httpStatus.OK).json(result);
});

module.exports = {
  getEventAttendees,
};