const cron = require("node-cron");
const { Booking, Event } = require("../models");
const emailService = require("./email.service");

const sendRemindersForWindow = async (hoursFromNow, windowMinutes = 30) => {
  const now = new Date();

  const windowMs = windowMinutes * 60 * 1000;
  const targetTime = new Date(now.getTime() + hoursFromNow * 60 * 60 * 1000);
  const from = new Date(targetTime.getTime() - windowMs);
  const to   = new Date(targetTime.getTime() + windowMs);

  const events = await Event.find({
    status:    "published",
    startDate: { $gte: from, $lte: to },
  });

  if (!events.length) {
    console.log(`[reminders] No events found for ${hoursFromNow}hr window`);
    return;
  }

  console.log(
    `[reminders] Found ${events.length} event(s) for ${hoursFromNow}hr reminder`
  );

  for (const event of events) {
    const bookings = await Booking.find({
      event:  event._id,
      status: "confirmed",
    }).populate("user", "name email");

    console.log(
      `[reminders] Sending ${hoursFromNow}hr reminder for "${event.title}" to ${bookings.length} attendee(s)`
    );

    for (const booking of bookings) {
      if (!booking.user?.email) continue;

      emailService
        .sendEventReminder({
          user:         booking.user,
          event,
          booking,
          hoursFromNow,
        })
        .catch((err) =>
          console.error(
            `[reminders] Failed to send to ${booking.user.email}:`,
            err.message
          )
        );
    }
  }
};

const registerReminderJobs = () => {
  cron.schedule("0 * * * *", async () => {
    console.log("[reminders] Running 1-hour reminder job...");
    await sendRemindersForWindow(1);
  });

  cron.schedule("0 * * * *", async () => {
    console.log("[reminders] Running 24-hour reminder job...");
    await sendRemindersForWindow(24);
  });

  console.log("[reminders] Reminder cron jobs registered ✓");
};

module.exports = {
  registerReminderJobs,
  sendRemindersForWindow, 
};