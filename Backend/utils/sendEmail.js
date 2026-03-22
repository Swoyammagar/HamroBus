const nodemailer = require("nodemailer");
const path = require("path");
require("dotenv").config();

const createTransporter = (useAltConfig = false) => {
  const user = String(process.env.NODE_MAILER_EMAIL || '').trim();
  const pass = String(process.env.NODE_MAILER_PASSWORD || '').trim();

  if (useAltConfig) {
    // Fallback transport: STARTTLS on 587
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user, pass },
      connectionTimeout: 45000,
      greetingTimeout: 30000,
      socketTimeout: 45000,
    });
  }

  // Primary transport: SSL on 465
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 45000,
    greetingTimeout: 30000,
    socketTimeout: 45000,
  });
};

const sendEmail = async (email, html, subject, cc = [], bcc = []) => {
  try {
    const to = String(email || '').trim().toLowerCase();
    const from = String(process.env.NODE_MAILER_EMAIL || '').trim();

    if (!to) {
      return { success: false, error: 'Recipient email is required' };
    }

    if (!from || !String(process.env.NODE_MAILER_PASSWORD || '').trim()) {
      return { success: false, error: 'Mailer credentials are not configured' };
    }

    const mailOptions = {
      from,
      to,
      subject: subject,
      html: html,
      cc: cc,
      bcc: bcc,
      attachments: [
        {
          filename: "hamrobuslogo.png",
          path: path.join(__dirname, "hamrobuslogo.png"), // Put the logo in /utils
          cid: "hamrobuslogo", // Refer this in the HTML img tag
        },
      ],
    };

    let response;
    try {
      response = await createTransporter(false).sendMail(mailOptions);
    } catch (primaryError) {
      const message = String(primaryError?.message || '').toLowerCase();
      const isTimeoutLike =
        message.includes('timeout') ||
        message.includes('timed out') ||
        primaryError?.code === 'ETIMEDOUT' ||
        primaryError?.code === 'ESOCKET';

      if (!isTimeoutLike) {
        throw primaryError;
      }

      console.warn('⚠️ Primary SMTP transport failed, retrying with fallback transport...');
      response = await createTransporter(true).sendMail(mailOptions);
    }

    const accepted = Array.isArray(response?.accepted) ? response.accepted : [];
    const rejected = Array.isArray(response?.rejected) ? response.rejected : [];

    if (accepted.length === 0 || rejected.length > 0) {
      console.error('❌ Email not fully accepted by SMTP:', {
        to,
        accepted,
        rejected,
        response: response?.response,
      });
      return {
        success: false,
        error: 'Email was not accepted by SMTP server',
        response,
      };
    }

    console.log('✅ Email accepted by SMTP:', { to, accepted });
    return { success: true, response };
  } catch (error) {
    console.error("❌ Email failed to send: " + error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };
