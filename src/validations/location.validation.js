const Joi = require('joi');
const { objectId } = require('./custom.validation');

const createLocation = {
  body: Joi.object().keys({
    name: Joi.string().trim().max(200).required(),
    address: Joi.string().trim().when('lat', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required(),
    }),
    lat: Joi.number().min(-90).max(90),
    lng: Joi.number().min(-180).max(180).when('lat', {
      is: Joi.exist(),
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    placeId: Joi.string().trim(),
    description: Joi.string().trim().max(1000),
    capacity: Joi.number().integer().min(1),
  }),
};

const getLocation = {
  params: Joi.object().keys({
    locationId: Joi.string().custom(objectId).required(),
  }),
};

const updateLocation = {
  params: Joi.object().keys({
    locationId: Joi.string().custom(objectId).required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string().trim().max(200),
      address: Joi.string().trim(),
      lat: Joi.number().min(-90).max(90),
      lng: Joi.number().min(-180).max(180),
      placeId: Joi.string().trim(),
      description: Joi.string().trim().max(1000),
      capacity: Joi.number().integer().min(1),
      isActive: Joi.boolean(),
    })
    .min(1),
};

const deleteLocation = {
  params: Joi.object().keys({
    locationId: Joi.string().custom(objectId).required(),
  }),
};

const geocodeAddress = {
  query: Joi.object().keys({
    address: Joi.string().trim().required(),
  }),
};

const reverseGeocode = {
  query: Joi.object().keys({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
  }),
};

const getNearbyPlaces = {
  query: Joi.object().keys({
    lat: Joi.number().min(-90).max(90).required(),
    lng: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().integer().min(1).max(50000).default(1500),
    type: Joi.string().default('establishment'),
  }),
};

module.exports = {
  createLocation,
  getLocation,
  updateLocation,
  deleteLocation,
  geocodeAddress,
  reverseGeocode,
  getNearbyPlaces,
};