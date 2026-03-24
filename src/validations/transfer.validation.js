const Joi = require("joi");

const transferBooking = {
  params: Joi.object().keys({
    bookingId: Joi.string()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .required()
      .messages({ "string.pattern.base": "bookingId must be a valid MongoDB ObjectId" }),
  }),

  body: Joi.object().keys({
    recipientEmail: Joi.string().email().required().messages({
      "string.email":   "recipientEmail must be a valid email address",
      "any.required":   "recipientEmail is required",
    }),
  }),
};

module.exports = {
  transferBooking,
};