const httpStatus = require("http-status");
const { Event, Location, Review } = require("../models"); // ← add Review
const ApiError = require("../utils/ApiError");
const locationService = require("./location.service");

const withLocation = async (event) => {
  await event.populate({
    path: "location",
    select: "name address coordinates placeId description capacity",
  });

  if (event.location) {
    const loc = event.location.toObject
      ? event.location.toObject()
      : event.location;
    loc.staticMapUrl = locationService.buildStaticMapUrl(loc);
    event.location = loc;
  }

  return event;
};

const withReviews = async (eventObj) => {
  const eventId = eventObj._id || eventObj.id;

  const [reviews, summary] = await Promise.all([
    Review.find({ event: eventId })
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .lean(),

    Review.aggregate([
      { $match: { event: new (require("mongoose").Types.ObjectId)(eventId) } },
      {
        $group: {
          _id: "$event",
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 },
        },
      },
    ]),
  ]);

  const ratingInfo = summary[0] || { averageRating: 0, totalReviews: 0 };

  return {
    ...eventObj,
    reviews,
    averageRating: Math.round((ratingInfo.averageRating || 0) * 10) / 10,
    totalReviews: ratingInfo.totalReviews || 0,
  };
};

const resolveLocation = async (location, organizerId) => {
  if (!location) return null;

  if (typeof location === "string") {
    if (/^[a-fA-F0-9]{24}$/.test(location)) return location;
    return null;
  }

  if (typeof location === "object") {
    const loc = await locationService.createLocation({
      ...location,
      organizerId,
    });
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

  const populated = await withLocation(event);
  const obj = populated.toObject ? populated.toObject() : populated;
  return withReviews(obj);
};

const queryEvents = async (filter, options) => {
  const result = await Event.paginate(filter, {
    ...options,
    populate: {
      path: "location",
      select: "name address coordinates placeId",
    },
  });

  result.results = await Promise.all(
    result.results.map(async (event) => {
      const obj = event.toObject ? event.toObject() : event;

      if (obj.location?.coordinates) {
        obj.location.staticMapUrl = locationService.buildStaticMapUrl(
          obj.location
        );
      }

      return withReviews(obj);
    })
  );

  return result;
};

const getEventById = async (eventId) => {
  if (!eventId || !/^[a-fA-F0-9]{24}$/.test(eventId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid event ID format");
  }

  const event = await Event.findById(eventId);
  if (!event) return null;

  const populated = await withLocation(event);
  const obj = populated.toObject ? populated.toObject() : populated;
  return withReviews(obj);
};

const updateEventById = async (eventId, organizerId, body) => {
  if (!eventId || !/^[a-fA-F0-9]{24}$/.test(eventId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid event ID format");
  }

  const eventExists = await Event.findById(eventId);
  if (!eventExists) throw new ApiError(httpStatus.NOT_FOUND, "Event not found");

  const event = await Event.findOne({ _id: eventId, organizer: organizerId });
  if (!event)
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You do not have permission to update this event"
    );

  const { location, ...rest } = body;

  if (location !== undefined) {
    const locationId = await resolveLocation(location, organizerId);
    event.location = locationId;
  }

  Object.assign(event, rest);
  await event.save();

  const populated = await withLocation(event);
  const obj = populated.toObject ? populated.toObject() : populated;
  return withReviews(obj);
};

const setEventLocation = async (eventId, organizerId, locationId) => {
  const [event, location] = await Promise.all([
    Event.findOne({ _id: eventId, organizer: organizerId }),
    Location.findById(locationId),
  ]);

  if (!event)
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Event not found or access denied"
    );
  if (!location) throw new ApiError(httpStatus.NOT_FOUND, "Location not found");

  event.location = location._id;
  await event.save();
  return withLocation(event);
};

const removeEventLocation = async (eventId, organizerId) => {
  const event = await Event.findOne({ _id: eventId, organizer: organizerId });
  if (!event)
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Event not found or access denied"
    );

  event.location = null;
  await event.save();
  return event;
};

const cancelEvent = async (eventId, organizerId) => {
  const event = await Event.findOne({ _id: eventId, organizer: organizerId });
  if (!event)
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Event not found or access denied"
    );
  if (event.status === "cancelled") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Event is already cancelled");
  }

  event.status = "cancelled";
  await event.save();
  return event;
};

const deleteEventById = async (eventId, organizerId) => {
  if (!eventId || !/^[a-fA-F0-9]{24}$/.test(eventId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid event ID format");
  }

  const eventExists = await Event.findById(eventId);
  if (!eventExists) throw new ApiError(httpStatus.NOT_FOUND, "Event not found");

  const event = await Event.findOne({ _id: eventId, organizer: organizerId });
  if (!event)
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "You do not have permission to delete this event"
    );

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
