const express = require("express");
const authRoute = require("./auth.route");
const userRoute = require("./user.route");
const eventRoute = require("./event.route");
const locationRoute = require("./location.route");
const reviewRoute = require("./review.route");
const bookingRoute = require("./booking.route");

const router = express.Router();

const defaultRoutes = [
  { path: "/auth", route: authRoute },
  { path: "/users", route: userRoute },
  { path: "/events", route: eventRoute },
  { path: "/locations", route: locationRoute },
  { path: "/bookings", route: bookingRoute },
  { path: "/events/:eventId/reviews", route: reviewRoute },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;
