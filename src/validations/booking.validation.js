const Joi = require("joi");
const { objectId } = require("./custom.validation");

const ticketItem = Joi.object({
  ticketTypeName: Joi.string().trim().required(),
  quantity: Joi.number().integer().min(1).max(20).required(),
});

const bookTickets = {
  params: Joi.object().keys({
    eventId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    tickets: Joi.array().items(ticketItem).min(1).max(10).required(),
  }),
};

module.exports = { bookTickets };
