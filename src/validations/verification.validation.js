const Joi = require("joi");

const bookingReferenceSchema = Joi.string()
  .trim()
  .uppercase()
  .pattern(/^BK-[A-F0-9]{8}$/)
  .required()
  .messages({
    "string.pattern.base":
      'bookingReference must match the format BK-XXXXXXXX (e.g. "BK-A1B2C3D4")',
    "any.required": "bookingReference is required",
  });

const verifyBooking = {
  body: Joi.object().keys({
    bookingReference: bookingReferenceSchema,
  }),
};

const lookupBooking = {
  params: Joi.object().keys({
    bookingReference: bookingReferenceSchema,
  }),
};

module.exports = {
  verifyBooking,
  lookupBooking,
};