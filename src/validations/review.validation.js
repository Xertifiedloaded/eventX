const Joi = require("joi");
const { objectId } = require("./custom.validation");

const createReview = {
  params: Joi.object().keys({
    eventId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object().keys({
    rating: Joi.number().integer().min(1).max(5).required(),
    comment: Joi.string().max(1000).optional(),
  }),
};

const getEventReviews = {
  params: Joi.object().keys({
    eventId: Joi.string().custom(objectId).required(),
  }),
  query: Joi.object().keys({
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    sortBy: Joi.string(),
  }),
};

const updateReview = {
  params: Joi.object().keys({
    eventId: Joi.string().custom(objectId).required(), 
    reviewId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      rating: Joi.number().integer().min(1).max(5),
      comment: Joi.string().max(1000),
    })
    .min(1),
};

const deleteReview = {
  params: Joi.object().keys({
    eventId: Joi.string().custom(objectId).required(), 
    reviewId: Joi.string().custom(objectId).required(),
  }),
};

module.exports = {
  createReview,
  getEventReviews,
  updateReview,
  deleteReview,
};
