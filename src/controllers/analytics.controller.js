const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const analyticsService = require("../services/analytics.service");

const getEventAnalytics = catchAsync(async (req, res) => {
  const result = await analyticsService.getEventAnalytics(
    req.params.eventId,
    req.user.id
  );
  res.status(httpStatus.OK).json(result);
});

const getOrganizerAnalytics = catchAsync(async (req, res) => {
  const result = await analyticsService.getOrganizerAnalytics(req.user.id);
  res.status(httpStatus.OK).json(result);
});

module.exports = {
  getEventAnalytics,
  getOrganizerAnalytics,
};