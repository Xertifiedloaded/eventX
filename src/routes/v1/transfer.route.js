const express = require("express");
const auth = require("../../middlewares/auth");
const validate = require("../../middlewares/validate");
const transferValidation = require("../../validations/transfer.validation");
const transferController = require("../../controllers/transfer.controller");

const router = express.Router();


router.post(
  "/:bookingId",
  auth(),
  validate(transferValidation.transferBooking),
  transferController.transferBooking
);

module.exports = router;