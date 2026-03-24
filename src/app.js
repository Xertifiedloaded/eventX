const express = require("express");
const helmet = require("helmet");
const xss = require("xss-clean");
const mongoSanitize = require("express-mongo-sanitize");
const compression = require("compression");
const cors = require("cors");
const passport = require("passport");
const httpStatus = require("http-status");
const config = require("./config/config");
const morgan = require("./config/morgan");
const { authLimiter } = require("./middlewares/rateLimiter");
const {
  jwtStrategy,
  googleStrategy,
  facebookStrategy,
  githubStrategy,
} = require("./config/passport");
const routes = require("./routes/v1");
const { errorConverter, errorHandler } = require("./middlewares/error");
const ApiError = require("./utils/ApiError");
const app = express();
if (config.env !== "test") {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(xss());
app.use(mongoSanitize());
app.use(compression());
app.use(cors());
passport.use(jwtStrategy);
passport.use(googleStrategy);
passport.use(facebookStrategy);
passport.use(githubStrategy);

app.options("*", cors());
app.get("/", (req, res) => {
  res.send("Hello, Welcome to eventX Environment");
});
app.use(passport.initialize());
passport.use("jwt", jwtStrategy);
if (config.env === "production") {
  app.use("/v1/auth", authLimiter);
}

app.use("/v1", routes);
app.use(
  "/api/bookings/paystack/webhook",
  express.raw({ type: "application/json" }),
  require("./routes/v1/booking.route")
);
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, "Not found"));
});
app.use(errorConverter);

app.use(errorHandler);

module.exports = app;
