const mongoose = require("mongoose");
const app = require("./app");
const config = require("./config/config");
const logger = require("./config/logger");
const { registerReminderJobs } = require("./services/reminder.service");
let server;
const PORT = process.env.PORT || config.port || 4500;

mongoose
  .connect(config.mongoose.url, config.mongoose.options)
  .then(async (conn) => {
    logger.info("Connected to MongoDB");
    const db = mongoose.connection.db;
    const admin = db.admin();
    const info = await admin.command({ connectionStatus: 1 });
    const username = info.authInfo.authenticatedUsers[0]?.user || "Unknown";
    const dbName = db.databaseName;
    const collections = await db.listCollections().toArray();

    logger.info(`MongoDB Username: ${username}`);
    logger.info(`Database Name: ${dbName}`);
    logger.info(`Collections: ${collections.map((c) => c.name).join(", ")}`);

    server = app.listen(PORT, () => {
      logger.info(`Server running on port http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    logger.error("MongoDB connection error:", err);
    process.exit(1);
  });

mongoose.connection.once("open", () => {
  console.log("database connected");
  registerReminderJobs(); 
});

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info("Server closed");
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);

process.on("SIGTERM", () => {
  logger.info("SIGTERM received");
  if (server) {
    server.close(() => {
      logger.info("Server closed due to SIGTERM");
    });
  }
});
