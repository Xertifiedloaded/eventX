const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const verificationValidation = require("../../validations/verification.validation");
const verificationController = require("../../controllers/verification.controller");

const router = express.Router();

router.post(
  "/",
  auth(),                                         
  validate(verificationValidation.verifyBooking),
  verificationController.verifyBooking
);


router.get(
  "/:bookingReference",
  auth(),
  validate(verificationValidation.lookupBooking),
  verificationController.lookupBooking
);

module.exports = router;