const httpStatus = require("http-status");
const mongoose = require("mongoose");
const { Booking, Event } = require("../models");
const ApiError = require("../utils/ApiError");

const getEventAnalytics = async (eventId, organizerId) => {
  if (!eventId || !/^[a-fA-F0-9]{24}$/.test(eventId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid event ID format");
  }

  const event = await Event.findOne({ _id: eventId, organizer: organizerId });
  if (!event) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      "Event not found or you are not the organizer"
    );
  }

  const eventObjId = new mongoose.Types.ObjectId(eventId);

  const [
    ticketTypeSales,
    checkInStats,
    dailyTrends,
    revenueSummary,
    bookingStatusBreakdown,
  ] = await Promise.all([
    Booking.aggregate([
      { $match: { event: eventObjId, status: "confirmed" } },
      { $unwind: "$tickets" },
      {
        $group: {
          _id: "$tickets.ticketTypeName",
          quantitySold: { $sum: "$tickets.quantity" },
          revenue:      { $sum: "$tickets.subtotal" },
          unitPrice:    { $first: "$tickets.unitPrice" },
        },
      },
      { $sort: { revenue: -1 } },
    ]),

    Booking.aggregate([
      { $match: { event: eventObjId, status: "confirmed" } },
      {
        $group: {
          _id: null,
          totalConfirmed: { $sum: 1 },
          totalCheckedIn: {
            $sum: { $cond: [{ $eq: ["$checkedIn", true] }, 1, 0] },
          },
        },
      },
    ]),

    Booking.aggregate([
      {
        $match: {
          event: eventObjId,
          status: "confirmed",
          createdAt: {
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          bookings:  { $sum: 1 },
          revenue:   { $sum: "$totalAmount" },
          tickets:   { $sum: { $sum: "$tickets.quantity" } },
        },
      },
      { $sort: { _id: 1 } },
    ]),

    Booking.aggregate([
      { $match: { event: eventObjId, status: "confirmed" } },
      {
        $group: {
          _id: null,
          totalRevenue:       { $sum: "$totalAmount" },
          totalBookings:      { $sum: 1 },
          totalTicketsSold:   { $sum: { $sum: "$tickets.quantity" } },
          freeBookings:       { $sum: { $cond: ["$isFreeBooking", 1, 0] } },
          paidBookings:       { $sum: { $cond: ["$isFreeBooking", 0, 1] } },
        },
      },
    ]),

    Booking.aggregate([
      { $match: { event: eventObjId } },
      {
        $group: {
          _id:   "$status",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const ci = checkInStats[0] || { totalConfirmed: 0, totalCheckedIn: 0 };
  const checkInRate =
    ci.totalConfirmed > 0
      ? Math.round((ci.totalCheckedIn / ci.totalConfirmed) * 100)
      : 0;

  const rev = revenueSummary[0] || {
    totalRevenue:     0,
    totalBookings:    0,
    totalTicketsSold: 0,
    freeBookings:     0,
    paidBookings:     0,
  };

  const ticketCapacity = (event.ticketTypes || []).map((tt) => {
    const sold = ticketTypeSales.find((s) => s._id === tt.name);
    return {
      ticketTypeName: tt.name,
      price:          tt.price,
      totalCapacity:  tt.quantity,
      sold:           tt.sold ?? sold?.quantitySold ?? 0,
      remaining:      tt.quantity - (tt.sold ?? sold?.quantitySold ?? 0),
      revenue:        sold?.revenue ?? 0,
      soldOutPercent:
        tt.quantity > 0
          ? Math.round(((tt.sold ?? 0) / tt.quantity) * 100)
          : 0,
    };
  });

  const statusMap = {};
  bookingStatusBreakdown.forEach(({ _id, count }) => {
    statusMap[_id] = count;
  });

  return {
    event: {
      id:        event._id,
      title:     event.title,
      startDate: event.startDate,
      endDate:   event.endDate,
      status:    event.status,
    },

    summary: {
      totalRevenue:     rev.totalRevenue,
      totalBookings:    rev.totalBookings,
      totalTicketsSold: rev.totalTicketsSold,
      freeBookings:     rev.freeBookings,
      paidBookings:     rev.paidBookings,
      currency:         "NGN",
    },

    checkIn: {
      totalConfirmed: ci.totalConfirmed,
      checkedIn:      ci.totalCheckedIn,
      notCheckedIn:   ci.totalConfirmed - ci.totalCheckedIn,
      checkInRate:    `${checkInRate}%`,
    },

    ticketTypes: ticketCapacity,

    bookingStatusBreakdown: {
      confirmed:       statusMap.confirmed       ?? 0,
      pending_payment: statusMap.pending_payment ?? 0,
      cancelled:       statusMap.cancelled       ?? 0,
      refunded:        statusMap.refunded        ?? 0,
    },

    dailyTrends: dailyTrends.map((d) => ({
      date:     d._id,
      bookings: d.bookings,
      revenue:  d.revenue,
      tickets:  d.tickets,
    })),
  };
};


const getOrganizerAnalytics = async (organizerId) => {
  const organizerObjId = new mongoose.Types.ObjectId(organizerId);

  const events = await Event.find({ organizer: organizerId }, "_id title startDate status");
  const eventIds = events.map((e) => e._id);

  if (!eventIds.length) {
    return {
      summary: {
        totalEvents:      0,
        totalRevenue:     0,
        totalBookings:    0,
        totalTicketsSold: 0,
      },
      perEvent: [],
    };
  }

  const [overallSummary, perEventStats] = await Promise.all([
    Booking.aggregate([
      { $match: { event: { $in: eventIds }, status: "confirmed" } },
      {
        $group: {
          _id: null,
          totalRevenue:     { $sum: "$totalAmount" },
          totalBookings:    { $sum: 1 },
          totalTicketsSold: { $sum: { $sum: "$tickets.quantity" } },
        },
      },
    ]),

    Booking.aggregate([
      { $match: { event: { $in: eventIds }, status: "confirmed" } },
      {
        $group: {
          _id:              "$event",
          revenue:          { $sum: "$totalAmount" },
          bookings:         { $sum: 1 },
          ticketsSold:      { $sum: { $sum: "$tickets.quantity" } },
          checkedIn:        { $sum: { $cond: ["$checkedIn", 1, 0] } },
        },
      },
    ]),
  ]);

  const summary = overallSummary[0] || {
    totalRevenue: 0, totalBookings: 0, totalTicketsSold: 0,
  };

  const statsMap = {};
  perEventStats.forEach((s) => { statsMap[s._id.toString()] = s; });

  const perEvent = events.map((ev) => {
    const s = statsMap[ev._id.toString()] || {
      revenue: 0, bookings: 0, ticketsSold: 0, checkedIn: 0,
    };
    return {
      eventId:     ev._id,
      title:       ev.title,
      startDate:   ev.startDate,
      status:      ev.status,
      revenue:     s.revenue,
      bookings:    s.bookings,
      ticketsSold: s.ticketsSold,
      checkedIn:   s.checkedIn,
    };
  });

  return {
    summary: {
      totalEvents:      events.length,
      totalRevenue:     summary.totalRevenue,
      totalBookings:    summary.totalBookings,
      totalTicketsSold: summary.totalTicketsSold,
      currency:         "NGN",
    },
    perEvent,
  };
};

module.exports = {
  getEventAnalytics,
  getOrganizerAnalytics,
};