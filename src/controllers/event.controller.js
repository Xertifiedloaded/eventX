const httpStatus = require("http-status");
const catchAsync = require("../utils/catchAsync");
const { eventService } = require("../services");
const ApiError = require("../utils/ApiError");
const pick = require("../utils/pick");

const parseTicketTypes = (body) => {
  if (!body.ticketTypes) return body;

  if (typeof body.ticketTypes === "string") {
    try {
      body.ticketTypes = JSON.parse(body.ticketTypes);
    } catch {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "ticketTypes must be a valid JSON array"
      );
    }
  }

  if (Array.isArray(body.ticketTypes)) {
    body.ticketTypes = body.ticketTypes.map((t) => ({
      ...t,
      price: Number(t.price),
      quantity: Number(t.quantity),
    }));
  }

  return body;
};

const parseBooleans = (body) => {
  ["isFreeEvent", "isOnlineEvent"].forEach((field) => {
    if (body[field] !== undefined) {
      body[field] = body[field] === "true" || body[field] === true;
    }
  });
  return body;
};

const parseLocation = (body) => {
  if (typeof body.location === "string" && body.location.startsWith("{")) {
    try {
      body.location = JSON.parse(body.location);
    } catch {
      delete body.location;
    }
    return body;
  }

  if (body.locationName || body.locationAddress) {
    body.location = {
      name: body.locationName,
      address: body.locationAddress,
      ...(body.locationLat && body.locationLng
        ? { lat: Number(body.locationLat), lng: Number(body.locationLng) }
        : {}),
    };
    delete body.locationName;
    delete body.locationAddress;
    delete body.locationLat;
    delete body.locationLng;
    return body;
  }

  return body;
};

const buildEventBody = (req) => {
  let body = { ...req.body };

  if (req.file) {
    body.coverImage = req.file.path ?? req.file.location;
  }

  body = parseBooleans(body);
  body = parseTicketTypes(body);
  body = parseLocation(body);

  return body;
};

const createEvent = catchAsync(async (req, res) => {
  const body = buildEventBody(req);
  const event = await eventService.createEvent(req.user.id, body);
  res.status(httpStatus.CREATED).send(event);
});

const getEvents = catchAsync(async (req, res) => {
  const filter = pick(req.query, [
    "category",
    "visibility",
    "status",
    "isOnlineEvent",
    "organizer",
  ]);
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await eventService.queryEvents(filter, options);
  res.send(result);
});

const getEvent = catchAsync(async (req, res) => {
  console.log("[v0] Getting event with ID:", req.params.eventId);
  const event = await eventService.getEventById(req.params.eventId);
  if (!event) throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  res.send(event);
});

const updateEvent = catchAsync(async (req, res) => {
  const body = buildEventBody(req);
  const event = await eventService.updateEventById(
    req.params.eventId,
    req.user.id,
    body
  );
  res.send(event);
});

const deleteEvent = catchAsync(async (req, res) => {
  await eventService.deleteEventById(req.params.eventId, req.user.id);
  res.status(httpStatus.NO_CONTENT).send();
});

const getOrganizerEvents = catchAsync(async (req, res) => {
  const filter = {
    organizer: req.user.id,
    ...pick(req.query, ["status", "category", "visibility"]),
  };
  const options = pick(req.query, ["sortBy", "limit", "page"]);
  const result = await eventService.queryEvents(filter, options);
  res.send(result);
});

const setEventLocation = catchAsync(async (req, res) => {
  const event = await eventService.setEventLocation(
    req.params.eventId,
    req.user.id,
    req.body.locationId
  );
  res.send(event);
});

const createInlineLocation = catchAsync(async (req, res) => {
  const event = await eventService.updateEventById(
    req.params.eventId,
    req.user.id,
    {
      location: req.body,
    }
  );
  res.send(event);
});

const removeEventLocation = catchAsync(async (req, res) => {
  await eventService.removeEventLocation(req.params.eventId, req.user.id);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent,
  getOrganizerEvents,
  setEventLocation,
  createInlineLocation,
  removeEventLocation,
};
