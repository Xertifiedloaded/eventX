const Joi = require("joi");

const getEventAnalytics = {
  params: Joi.object().keys({
    eventId: Joi.string()
      .pattern(/^[a-fA-F0-9]{24}$/)
      .required()
      .messages({ "string.pattern.base": "eventId must be a valid MongoDB ObjectId" }),
  }),
};

module.exports = {
  getEventAnalytics,
};