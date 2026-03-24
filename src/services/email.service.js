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
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">${
          t.ticketTypeName
        }</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:center;">${
          t.quantity
        }</td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;">
          ${
            t.unitPrice === 0
              ? "Free"
              : `₦${Number(t.unitPrice).toLocaleString("en-NG")}`
          }
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;text-align:right;">
          ${
            t.subtotal === 0
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
  const qrSrc = booking.qrCodeImage; // base64 data URI

  const locationLine = event.isOnlineEvent
    ? `<span style="color:#6366f1;">Online Event</span> — <a href="${event.onlineEventLink}" style="color:#6366f1;">${event.onlineEventLink}</a>`
    : event.venueName || "Venue TBC";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>Booking Confirmation</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;color:#18181b;">
 
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr><td align="center">
 
      <!-- Card -->
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:600px;">
 
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:40px 48px 32px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,.15);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:30px;margin-bottom:16px;">🎟️</div>
            <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-.5px;">Booking Confirmed!</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,.85);font-size:15px;">Your spot is secured. See you there!</p>
          </td>
        </tr>
 
        <!-- Greeting -->
        <tr>
          <td style="padding:32px 48px 0;">
            <p style="margin:0;font-size:16px;color:#52525b;">Hi <strong>${firstName}</strong>,</p>
            <p style="margin:10px 0 0;font-size:15px;color:#71717a;line-height:1.6;">
              Your booking for <strong style="color:#18181b;">${
                event.title
              }</strong> has been confirmed.
              Please keep this email — you'll need the QR code below to check in.
            </p>
          </td>
        </tr>
 
        <!-- Event Details Box -->
        <tr>
          <td style="padding:24px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8ff;border-radius:12px;border:1px solid #e0e7ff;overflow:hidden;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 14px;font-size:13px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:.8px;">Event Details</p>
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="padding:5px 0;font-size:13px;color:#71717a;width:90px;">📅 Date</td>
                      <td style="padding:5px 0;font-size:14px;color:#18181b;font-weight:500;">${formatDate(
                        event.startDateTime
                      )}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;font-size:13px;color:#71717a;">⏰ Ends</td>
                      <td style="padding:5px 0;font-size:14px;color:#18181b;font-weight:500;">${formatDate(
                        event.endDateTime
                      )}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;font-size:13px;color:#71717a;">📍 Location</td>
                      <td style="padding:5px 0;font-size:14px;color:#18181b;font-weight:500;">${locationLine}</td>
                    </tr>
                    <tr>
                      <td style="padding:5px 0;font-size:13px;color:#71717a;">🏷️ Ref</td>
                      <td style="padding:5px 0;font-size:14px;color:#18181b;font-weight:700;letter-spacing:.5px;">${
                        booking.bookingReference
                      }</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
 
        <!-- Tickets Table -->
        <tr>
          <td style="padding:24px 48px 0;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:.8px;">Your Tickets</p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;font-size:14px;">
              <thead>
                <tr style="background:#f4f4f5;">
                  <th style="padding:10px 14px;text-align:left;font-weight:600;color:#52525b;">Ticket</th>
                  <th style="padding:10px 14px;text-align:center;font-weight:600;color:#52525b;">Qty</th>
                  <th style="padding:10px 14px;text-align:right;font-weight:600;color:#52525b;">Unit</th>
                  <th style="padding:10px 14px;text-align:right;font-weight:600;color:#52525b;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${ticketRows}
              </tbody>
              <tfoot>
                <tr style="background:#f8f8ff;">
                  <td colspan="3" style="padding:12px 14px;font-weight:700;text-align:right;color:#18181b;">Total</td>
                  <td style="padding:12px 14px;font-weight:700;text-align:right;font-size:16px;">
                    ${formatCurrency(booking.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </td>
        </tr>
 
        <!-- QR Code -->
        <tr>
          <td style="padding:28px 48px 0;text-align:center;">
            <p style="margin:0 0 16px;font-size:13px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:.8px;">Your Entry QR Code</p>
            <div style="display:inline-block;background:#ffffff;border:2px solid #e0e7ff;border-radius:16px;padding:16px;">
              <img src="${qrSrc}" alt="Entry QR Code" width="220" height="220" style="display:block;border-radius:8px;"/>
            </div>
            <p style="margin:12px 0 0;font-size:12px;color:#a1a1aa;">Show this QR code at the event entrance for check-in</p>
            <p style="margin:6px 0 0;font-size:13px;font-weight:700;letter-spacing:2px;color:#52525b;">${
              booking.bookingReference
            }</p>
          </td>
        </tr>
 
        <!-- Important Notice -->
        <tr>
          <td style="padding:24px 48px 0;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fefce8;border:1px solid #fde047;border-radius:10px;">
              <tr>
                <td style="padding:16px 20px;font-size:13px;color:#713f12;line-height:1.6;">
                  <strong>⚠️ Important:</strong> This QR code is your entry pass. Do not share it publicly.
                  Each code can only be used once. Please arrive on time.
                </td>
              </tr>
            </table>
          </td>
        </tr>
 
        <!-- Footer -->
        <tr>
          <td style="padding:32px 48px;text-align:center;border-top:1px solid #f0f0f0;margin-top:24px;">
            <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.6;">
              This email was sent to <strong>${
                user.email
              }</strong> because you booked a ticket.<br/>
              If you did not make this booking, please contact us immediately.
            </p>
            <p style="margin:16px 0 0;font-size:12px;color:#d4d4d8;">
              © ${new Date().getFullYear()} EventApp. All rights reserved.
            </p>
          </td>
        </tr>
 
      </table>
      <!-- /Card -->
 
    </td></tr>
  </table>
  <!-- /Wrapper -->
 
</body>
</html>`;

  return html;
};

const sendBookingConfirmation = async ({ user, event, booking }) => {
  const transporter = transport; 
  const html = buildConfirmationEmail({ user, event, booking });

  const totalLabel =
    booking.totalAmount === 0
      ? "Free"
      : `₦${Number(booking.totalAmount).toLocaleString("en-NG")}`;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"EventApp" <noreply@eventapp.com>',
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
};
