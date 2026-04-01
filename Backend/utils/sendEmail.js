const sgMail = require("@sendgrid/mail");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

// Set API Key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendEmail = async (email, html, subject, cc = [], bcc = []) => {
  try {
    // Read and encode image as base64 (for inline logo)
    const logoPath = path.join(__dirname, "hamrobuslogo.png");
    const logoBase64 = fs.readFileSync(logoPath).toString("base64");

    const msg = {
      to: email,
      from: process.env.SENDGRID_VERIFIED_EMAIL, // MUST be verified in SendGrid
      subject: subject,
      html: html,
      cc: cc,
      bcc: bcc,
      attachments: [
        {
          content: logoBase64,
          filename: "hamrobuslogo.png",
          type: "image/png",
          disposition: "inline",
          content_id: "hamrobuslogo", // use cid:hamrobuslogo in HTML
        },
      ],
    };

    const response = await sgMail.send(msg);
    console.log("✅ Email sent successfully.");
    return { success: true, response };
  } catch (error) {
    console.error("❌ Email failed to send:");
    console.error(error.response?.body || error.message);
    return { success: false, error: error.message };
  }
};

module.exports = { sendEmail };