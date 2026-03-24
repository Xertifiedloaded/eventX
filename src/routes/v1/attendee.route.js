const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const attendeeValidation = require("../../validations/attendee.validation");
const attendeeController = require("../../controllers/attendee.controller");

const router = express.Router({ mergeParams: true }); 

router.get(
  "/",
  auth(),
  validate(attendeeValidation.getEventAttendees),
  attendeeController.getEventAttendees
);

module.exports = router;