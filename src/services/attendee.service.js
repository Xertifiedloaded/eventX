const httpStatus = require("http-status");
const { Booking, Event } = require("../models");
const ApiError = require("../utils/ApiError");

const getEventAttendees = async (eventId, organizerId, filter, options) => {
  const event = await Event.findOne({ _id: eventId, organizer: organizerId });
  if (!event) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Event not found or you are not the organizer"
    );
  }

  const query = {
    event: eventId,
    status: "confirmed", 
  };

  if (filter.checkedIn !== undefined) {
    query.checkedIn = filter.checkedIn === "true" || filter.checkedIn === true;
  }

  const result = await Booking.paginate(query, {
    page: options.page || 1,
    limit: options.limit || 20,
    sort: options.sortBy || { createdAt: -1 },
    populate: [{ path: "user", select: "name email phone" }],
  });

  const [totalAttendees, checkedInCount] = await Promise.all([
    Booking.countDocuments({ event: eventId, status: "confirmed" }),
    Booking.countDocuments({ event: eventId, status: "confirmed", checkedIn: true }),
  ]);

  result.results = result.results.map((booking) => {
    const obj = booking.toObject ? booking.toObject() : booking;
    return {
      bookingReference: obj.bookingReference,
      attendee: {
        name: obj.user?.name ?? "N/A",
        email: obj.user?.email ?? "N/A",
        phone: obj.user?.phone ?? null,
      },
      tickets: obj.tickets,
      totalAmount: obj.totalAmount,
      isFreeBooking: obj.isFreeBooking,
      checkedIn: obj.checkedIn ?? false,
      checkedInAt: obj.checkedInAt ?? null,
      bookedAt: obj.createdAt,
    };
  });

  return {
    event: {
      id: event._id,
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
    },
    summary: {
      totalAttendees,
      checkedIn: checkedInCount,
      notCheckedIn: totalAttendees - checkedInCount,
    },
    ...result,
  };
};

module.exports = {
  getEventAttendees,
};