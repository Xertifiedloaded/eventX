const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const analyticsValidation = require("../../validations/analytics.validation");
const analyticsController = require("../../controllers/analytics.controller");

const router = express.Router();


router.get("/me", auth(), analyticsController.getOrganizerAnalytics);

router.get(
  "/events/:eventId",
  auth(),
  validate(analyticsValidation.getEventAnalytics),
  analyticsController.getEventAnalytics
);

module.exports = router;