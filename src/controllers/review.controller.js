const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const { reviewService } = require("../services");
const pick = require("../utils/pick");

const createReview = catchAsync(async (req, res) => {
  const review = await reviewService.createReview(
    req.user.id,
    req.params.eventId,
    req.body
  );
  res.status(httpStatus.CREATED).send(review);
});

const getEventReviews = catchAsync(async (req, res) => {
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await reviewService.getEventReviews(
    req.params.eventId,
    options
  );
  res.send(result);
});

const getEventRatingSummary = catchAsync(async (req, res) => {
  const summary = await reviewService.getEventRatingSummary(req.params.eventId);
  res.send(summary);
});

const updateReview = catchAsync(async (req, res) => {
  const review = await reviewService.updateReview(
    req.params.reviewId,
    req.user.id,
    req.body
  );
  res.send(review);
});

const deleteReview = catchAsync(async (req, res) => {
  await reviewService.deleteReview(req.params.reviewId, req.user.id);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createReview,
  getEventReviews,
  getEventRatingSummary,
  updateReview,
  deleteReview,
};
