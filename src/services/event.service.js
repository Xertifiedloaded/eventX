const httpStatus = require('http-status');
const { Event, Location } = require('../models');
const ApiError = require('../utils/ApiError');
const locationService = require('./location.service');

const withLocation = async (event) => {
  await event.populate({
    path: 'location',
    select: 'name address coordinates placeId description capacity',
  });

  if (event.location) {
    const loc = event.location.toObject ? event.location.toObject() : event.location;
    loc.staticMapUrl = locationService.buildStaticMapUrl(loc);
    event.location = loc;
  }

  return event;
};

const resolveLocation = async (location, organizerId) => {
  if (!location) return null;

  if (typeof location === 'string') {
    if (/^[a-fA-F0-9]{24}$/.test(location)) return location;
    return null;
  }

  if (typeof location === 'object') {
    const loc = await locationService.createLocation({ ...location, organizerId });
    return loc._id;
  }

  return null;
};


const createEvent = async (organizerId, body) => {
  const { location, ...rest } = body;

  const locationId = await resolveLocation(location, organizerId);

  const event = await Event.create({
    ...rest,
    organizer: organizerId,
    ...(locationId ? { location: locationId } : {}),
  });

  return withLocation(event);
};

const queryEvents = async (filter, options) => {
  const result = await Event.paginate(filter, {
    ...options,
    populate: {
      path: 'location',
      select: 'name address coordinates placeId',
    },
  });

  result.results = result.results.map((event) => {
    const obj = event.toObject ? event.toObject() : event;

    if (obj.location?.coordinates) {
      obj.location.staticMapUrl = locationService.buildStaticMapUrl(obj.location);
    }

    return obj;
  });

  return result;
};

const getEventById = async (eventId) => {
  if (!eventId || !/^[a-fA-F0-9]{24}$/.test(eventId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid event ID format');
  }
  
  const event = await Event.findById(eventId);
  if (!event) {
    return null; 
  }
  return withLocation(event);
};

const updateEventById = async (eventId, organizerId, body) => {
  if (!eventId || !/^[a-fA-F0-9]{24}$/.test(eventId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid event ID format');
  }

  const eventExists = await Event.findById(eventId);
  if (!eventExists) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found');
  }

  const event = await Event.findOne({ _id: eventId, organizer: organizerId });
  if (!event) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this event');
  }

  const { location, ...rest } = body;

  if (location !== undefined) {
    const locationId = await resolveLocation(location, organizerId);
    event.location = locationId;
  }

  Object.assign(event, rest);
  await event.save();
  return withLocation(event);
};

const setEventLocation = async (eventId, organizerId, locationId) => {
  const [event, location] = await Promise.all([
    Event.findOne({ _id: eventId, organizer: organizerId }),
    Location.findById(locationId),
  ]);

  if (!event) throw new ApiError(httpStatus.NOT_FOUND, 'Event not found or access denied');
  if (!location) throw new ApiError(httpStatus.NOT_FOUND, 'Location not found');

  event.location = location._id;
  await event.save();
  return withLocation(event);
};

const removeEventLocation = async (eventId, organizerId) => {
  const event = await Event.findOne({ _id: eventId, organizer: organizerId });
  if (!event) throw new ApiError(httpStatus.NOT_FOUND, 'Event not found or access denied');

  event.location = null;
  await event.save();
  return event;
};

const cancelEvent = async (eventId, organizerId) => {
  const event = await Event.findOne({ _id: eventId, organizer: organizerId });
  if (!event) throw new ApiError(httpStatus.NOT_FOUND, 'Event not found or access denied');
  if (event.status === 'cancelled') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Event is already cancelled');
  }

  event.status = 'cancelled';
  await event.save();
  return event;
};

const deleteEventById = async (eventId, organizerId) => {
  if (!eventId || !/^[a-fA-F0-9]{24}$/.test(eventId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid event ID format');
  }

  const eventExists = await Event.findById(eventId);
  if (!eventExists) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found');
  }
  const event = await Event.findOne({ _id: eventId, organizer: organizerId });
  if (!event) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to delete this event');
  }

  if (!['draft', 'cancelled'].includes(event.status)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Only draft or cancelled events can be deleted');
  }

  await event.deleteOne();
};

module.exports = {
  createEvent,
  queryEvents,
  getEventById,
  updateEventById,
  setEventLocation,
  removeEventLocation,
  cancelEvent,
  deleteEventById,
};
