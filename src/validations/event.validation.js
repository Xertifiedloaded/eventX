const Joi = require('joi');
const objectId = Joi.string()
  .pattern(/^[a-fA-F0-9]{24}$/)
  .message('must be a valid ObjectId');
const ticketTypeSchema = Joi.object({
  name:     Joi.string().trim().required(),
  price:    Joi.number().min(0).required(),
  quantity: Joi.number().integer().min(1).required(),
});
const inlineLocationSchema = Joi.object({
  name:    Joi.string().trim().required(),
  address: Joi.string().trim().required(),
  lat:     Joi.number().min(-90).max(90),
  lng:     Joi.number().min(-180).max(180),
});

const createEvent = {
  body: Joi.object()
    .keys({
      title:           Joi.string().trim().max(300).required(),
      description:     Joi.string().trim().max(5000).required(),
      category:        Joi.string()
                         .valid('music', 'sports', 'technology', 'business', 'arts', 'education', 'other')
                         .required(),
      startDateTime:   Joi.date().iso().required(),
      endDateTime:     Joi.date().iso().greater(Joi.ref('startDateTime')).required()
                         .messages({ 'date.greater': 'endDateTime must be after startDateTime' }),
      isFreeEvent:     Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).default(false),
      isOnlineEvent:   Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')).default(false),
      venueName:       Joi.string().trim().allow('', null),
      onlineEventLink: Joi.string().uri().trim().allow('', null),
      location: Joi.alternatives().try(
        objectId,
        inlineLocationSchema,
        Joi.string().trim()   
      ).allow(null),
      locationName:    Joi.string().trim().allow('', null),
      locationAddress: Joi.string().trim().allow('', null),
      locationLat:     Joi.alternatives().try(Joi.number(), Joi.string()).allow(null),
      locationLng:     Joi.alternatives().try(Joi.number(), Joi.string()).allow(null),
      ticketTypes: Joi.alternatives().try(
        Joi.array().items(ticketTypeSchema),
        Joi.string().trim()   
      ).allow(null),

      visibility: Joi.string().valid('public', 'private').default('public'),
      status:     Joi.string().valid('draft', 'published', 'cancelled', 'completed').default('draft'),

    })
    .unknown(false),  
};
const getEvents = {
  query: Joi.object().keys({
    category:     Joi.string().valid('music', 'sports', 'technology', 'business', 'arts', 'education', 'other'),
    visibility:   Joi.string().valid('public', 'private'),
    status:       Joi.string().valid('draft', 'published', 'cancelled', 'completed'),
    isOnlineEvent: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')),
    organizer:    objectId,
    sortBy:       Joi.string(),
    limit:        Joi.number().integer().min(1).max(100).default(10),
    page:         Joi.number().integer().min(1).default(1),
  }),
};

const eventId = {
  params: Joi.object().keys({
    eventId: objectId.required(),
  }),
};

const updateEvent = {
  params: Joi.object().keys({
    eventId: objectId.required(),
  }),
  body: Joi.object()
    .keys({
      title:           Joi.string().trim().max(300),
      description:     Joi.string().trim().max(5000),
      category:        Joi.string().valid('music', 'sports', 'technology', 'business', 'arts', 'education', 'other'),
      startDateTime:   Joi.date().iso(),
      endDateTime:     Joi.date().iso(),

      isFreeEvent:     Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')),
      isOnlineEvent:   Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')),

      venueName:       Joi.string().trim().allow('', null),
      onlineEventLink: Joi.string().uri().trim().allow('', null),

      location: Joi.alternatives().try(
        objectId,
        inlineLocationSchema,
        Joi.string().trim()
      ).allow(null),

      locationName:    Joi.string().trim().allow('', null),
      locationAddress: Joi.string().trim().allow('', null),
      locationLat:     Joi.alternatives().try(Joi.number(), Joi.string()).allow(null),
      locationLng:     Joi.alternatives().try(Joi.number(), Joi.string()).allow(null),

      ticketTypes: Joi.alternatives().try(
        Joi.array().items(ticketTypeSchema),
        Joi.string().trim()
      ).allow(null),

      visibility: Joi.string().valid('public', 'private'),
      status:     Joi.string().valid('draft', 'published', 'cancelled', 'completed'),
    })
    .unknown(false),
};

const setEventLocation = {
  params: Joi.object().keys({
    eventId: objectId.required(),
  }),
  body: Joi.object().keys({
    locationId: objectId.required(),
  }),
};

const createInlineLocation = {
  params: Joi.object().keys({
    eventId: objectId.required(),
  }),
  body: inlineLocationSchema,
};

const getOrganizerEvents = {
  query: Joi.object().keys({
    status:     Joi.string().valid('draft', 'published', 'cancelled', 'completed'),
    category:   Joi.string().valid('music', 'sports', 'technology', 'business', 'arts', 'education', 'other'),
    visibility: Joi.string().valid('public', 'private'),
    sortBy:     Joi.string(),
    limit:      Joi.number().integer().min(1).max(100).default(10),
    page:       Joi.number().integer().min(1).default(1),
  }),
};

module.exports = {
  createEvent,
  getEvents,
  getEvent:             eventId,
  updateEvent,
  deleteEvent:          eventId,
  setEventLocation,
  createInlineLocation,
  getOrganizerEvents,
};