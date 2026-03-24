const httpStatus = require("http-status");
const { Review, Event } = require("../models");
const ApiError = require("../utils/ApiError");

const createReview = async (userId, eventId, body) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  if (event.organizer.toString() === userId.toString()) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You cannot review your own event"
    );
  }

  const existing = await Review.findOne({ event: eventId, user: userId });
  if (existing) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "You have already reviewed this event"
    );
  }

  const review = await Review.create({
    event: eventId,
    user: userId,
    rating: body.rating,
    comment: body.comment,
  });

  return review.populate("user", "name");
};

const getEventReviews = async (eventId, options) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  const result = await Review.paginate(
    { event: eventId },
    {
      ...options,
      populate: "user,name",
      sortBy: options.sortBy || "createdAt:desc",
    }
  );

  return result;
};

const getEventRatingSummary = async (eventId) => {
  const summary = await Review.aggregate([
    { $match: { event: new (require("mongoose").Types.ObjectId)(eventId) } },
    {
      $group: {
        _id: "$event",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
        ratingBreakdown: {
          $push: "$rating",
        },
      },
    },
  ]);

  if (!summary.length) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  // Count each star rating
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  summary[0].ratingBreakdown.forEach((r) => {
    breakdown[r] += 1;
  });

  return {
    averageRating: Math.round(summary[0].averageRating * 10) / 10,
    totalReviews: summary[0].totalReviews,
    ratingBreakdown: breakdown,
  };
};

const updateReview = async (reviewId, userId, body) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, "Review not found");
  }

  if (review.user.toString() !== userId.toString()) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You can only edit your own review"
    );
  }

  Object.assign(review, body);
  await review.save();

  return review.populate("user", "name");
};

const deleteReview = async (reviewId, userId) => {
  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(httpStatus.NOT_FOUND, "Review not found");
  }

  if (review.user.toString() !== userId.toString()) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You can only delete your own review"
    );
  }

  await review.deleteOne();
};

module.exports = {
  createReview,
  getEventReviews,
  getEventRatingSummary,
  updateReview,
  deleteReview,
};
