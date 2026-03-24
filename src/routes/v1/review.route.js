const express = require("express");
const validate = require("../../middlewares/validate");
const reviewValidation = require("../../validations/review.validation");
const reviewController = require("../../controllers/review.controller");
const auth = require("../../middlewares/auth");

const router = express.Router({ mergeParams: true });
router
  .route("/")
  .post(
    auth(),
    validate(reviewValidation.createReview),
    reviewController.createReview
  )
  .get(
    validate(reviewValidation.getEventReviews),
    reviewController.getEventReviews
  );

router.route("/summary").get(reviewController.getEventRatingSummary);

router
  .route("/:reviewId")
  .patch(
    auth(),
    validate(reviewValidation.updateReview),
    reviewController.updateReview
  )
  .delete(
    auth(),
    validate(reviewValidation.deleteReview),
    reviewController.deleteReview
  );

module.exports = router;
