const nodemailer = require("nodemailer");
const config = require("../config/config");
const logger = require("../config/logger");

const transport = nodemailer.createTransport(config.email.smtp);

if (config.env !== "test") {
  transport
    .verify()
    .then(() => logger.info("Connected to email server"))
    .catch(() =>
      logger.warn(
        "Unable to connect to email server. Make sure you have configured the SMTP options in .env"
      )
    );
}

const sendEventReminder = ({ user, event, booking, hoursFromNow }) => {
  const timeLabel = hoursFromNow === 1 ? "1 hour" : "24 hours";
  const startDate = new Date(event.startDate).toLocaleString("en-NG", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  });

  const subject = `Reminder: "${event.title}" starts in ${timeLabel}!`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2>⏰ Event Reminder</h2>
      <p>Hi <strong>${user.name}</strong>,</p>
      <p>
        This is a friendly reminder that <strong>${event.title}</strong> 
        starts in <strong>${timeLabel}</strong>.
      </p>
 
      <table style="width:100%; border-collapse:collapse; margin: 20px 0;">
        <tr>
          <td style="padding:8px; font-weight:bold; background:#f5f5f5;">Event</td>
          <td style="padding:8px;">${event.title}</td>
        </tr>
        <tr>
          <td style="padding:8px; font-weight:bold; background:#f5f5f5;">Date & Time</td>
          <td style="padding:8px;">${startDate}</td>
        </tr>
        ${event.location?.name
      ? `<tr>
                <td style="padding:8px; font-weight:bold; background:#f5f5f5;">Location</td>
                <td style="padding:8px;">${event.location.name}${event.location.address ? `, ${event.location.address}` : ""
      }</td>
               </tr>`
      : ""
    }
        <tr>
          <td style="padding:8px; font-weight:bold; background:#f5f5f5;">Booking Ref</td>
          <td style="padding:8px;">${booking.bookingReference}</td>
        </tr>
      </table>
 
      <p>Please bring your QR code or booking reference for check-in.</p>
      <p style="color:#888; font-size:12px;">
        You received this email because you have a confirmed booking for this event.
      </p>
    </div>
  `;

  return transport.sendMail({
    from: process.env.EMAIL_FROM,
    to: user.email,
    subject,
    html,
  });
};

// ─── 2. Ticket Transfer Notification ─────────────────────────────────────────
const sendTicketTransferNotification = async ({
  previousOwner,
  newOwner,
  event,
  booking,
}) => {
  const startDate = new Date(event.startDate).toLocaleString("en-NG", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Lagos",
  });

  const senderHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2>🎟️ Ticket Transfer Confirmed</h2>
      <p>Hi <strong>${previousOwner.name}</strong>,</p>
      <p>
        Your ticket for <strong>${event.title}</strong> has been successfully 
        transferred to <strong>${newOwner.name}</strong> (${newOwner.email}).
      </p>
      <p>Your old booking reference <strong>${booking.bookingReference}</strong> is no longer valid.</p>
      <p style="color:#888; font-size:12px;">
        If you did not initiate this transfer, please contact support immediately.
      </p>
    </div>
  `;

  const recipientHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
      <h2>🎟️ You've Received a Ticket!</h2>
      <p>Hi <strong>${newOwner.name}</strong>,</p>
      <p>
        <strong>${previousOwner.name}</strong> has transferred their ticket for 
        <strong>${event.title}</strong> to you.
      </p>
 
      <table style="width:100%; border-collapse:collapse; margin: 20px 0;">
        <tr>
          <td style="padding:8px; font-weight:bold; background:#f5f5f5;">Event</td>
          <td style="padding:8px;">${event.title}</td>
        </tr>
        <tr>
          <td style="padding:8px; font-weight:bold; background:#f5f5f5;">Date</td>
          <td style="padding:8px;">${startDate}</td>
        </tr>
        <tr>
          <td style="padding:8px; font-weight:bold; background:#f5f5f5;">New Booking Ref</td>
          <td style="padding:8px;"><strong>${booking.bookingReference}</strong></td>
        </tr>
      </table>
 
      <p>Use your new booking reference or QR code for check-in.</p>
    </div>
  `;

  await Promise.all([
    transport.sendMail({
      from: process.env.EMAIL_FROM,
      to: previousOwner.email,
      subject: `Your ticket for "${event.title}" has been transferred`,
      html: senderHtml,
    }),
    transport.sendMail({
      from: process.env.EMAIL_FROM,
      to: newOwner.email,
      subject: `You've received a ticket for "${event.title}"!`,
      html: recipientHtml,
    }),
  ]);
};

const sendEmail = async (to, subject, text) => {
  const msg = { from: config.email.from, to, subject, text };
  await transport.sendMail(msg);
};

const sendResetPasswordEmail = async (to, token) => {
  const subject = "Reset password";
  const resetPasswordUrl = `http://link-to-app/reset-password?token=${token}`;
  const text = `Dear user,
To reset your password, click on this link: ${resetPasswordUrl}
If you did not request any password resets, then ignore this email.`;
  await sendEmail(to, subject, text);
};

const sendVerificationEmail = async (to, token) => {
  const subject = "Email Verification";
  const verificationEmailUrl = `http://link-to-app/verify-email?token=${token}`;
  const text = `Dear user,
To verify your email, click on this link: ${verificationEmailUrl}
If you did not create an account, then ignore this email.`;
  await sendEmail(to, subject, text);
};

const formatDate = (date) =>
  new Date(date).toLocaleString("en-NG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });

const formatCurrency = (amount) =>
  amount === 0
    ? '<span style="color:#16a34a;font-weight:700;">FREE</span>'
    : `₦${Number(amount).toLocaleString("en-NG", {
      minimumFractionDigits: 2,
    })}`;

const buildTicketRows = (tickets) =>
  tickets
    .map(
      (t) => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">${t.ticketTypeName}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;">${t.quantity}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;">
          ${t.unitPrice === 0
          ? "Free"
          : `₦${Number(t.unitPrice).toLocaleString("en-NG")}`
        }
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;">
          ${t.subtotal === 0
          ? "Free"
          : `₦${Number(t.subtotal).toLocaleString("en-NG")}`
        }
        </td>
      </tr>`
    )
    .join("");

const buildConfirmationEmail = ({ user, event, booking }) => {
  const firstName = (user.name || user.email).split(" ")[0];
  const ticketRows = buildTicketRows(booking.tickets);
  const qrSrc = booking.qrCodeImage;

  const locationLine = event.isOnlineEvent
    ? `<span style="color:#6366f1;">Online Event</span> — <a href="${event.onlineEventLink}" style="color:#6366f1;">${event.onlineEventLink}</a>`
    : event.venueName || "Venue TBC";

  const html = `...YOUR ORIGINAL HTML REMAINS UNCHANGED...`;

  return html;
};

const sendBookingConfirmation = async ({ user, event, booking }) => {
  const html = buildConfirmationEmail({ user, event, booking });

  const totalLabel =
    booking.totalAmount === 0
      ? "Free"
      : `₦${Number(booking.totalAmount).toLocaleString("en-NG")}`;

  await transport.sendMail({
    from: process.env.EMAIL_FROM || '"eventX" <noreply@eventx.com>',
    to: user.email,
    subject: `✅ Booking Confirmed: ${event.title} (${booking.bookingReference})`,
    text: [
      `Hi ${user.name || user.email},`,
      `Your booking for "${event.title}" is confirmed.`,
      `Booking Reference: ${booking.bookingReference}`,
      `Total: ${totalLabel}`,
      `Event Date: ${formatDate(event.startDateTime)}`,
      `Check-in with your QR code. See you there!`,
    ].join("\n\n"),
    html,
  });
};

module.exports = {
  transport,
  sendEmail,
  sendResetPasswordEmail,
  sendVerificationEmail,
  sendBookingConfirmation,
  sendEventReminder,
  sendTicketTransferNotification,
};