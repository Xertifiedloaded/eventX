const Joi = require("joi");

const getEventAttendees = {
  params: Joi.object().keys({
    eventId: Joi.string()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "eventId must be a valid MongoDB ObjectId",
        "any.required": "eventId is required",
      }),
  }),

  query: Joi.object().keys({
    checkedIn: Joi.boolean(),
    page:      Joi.number().integer().min(1),
    limit:     Joi.number().integer().min(1).max(100),
    sortBy:    Joi.string(),
  }),
};

module.exports = {
  getEventAttendees,
};