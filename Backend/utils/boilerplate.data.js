const baseStyles = `
  font-family: Arial, sans-serif;
  background-color: #f4f4f4;
  padding: 30px;
`;

const cardStyles = `
  max-width: 600px;
  margin: auto;
  background: white;
  border-radius: 8px;
  padding: 30px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.05);
`;

const getTemplate = (otp, username, greeting, message, note) => `
  <div style="${baseStyles}">
    <div style="${cardStyles}">
      <div style="text-align: center;">
        <img src="cid:hamrobuslogo" alt="HamroBus Logo" style="width: 120px; margin-bottom: 20px;" />
      </div>
      <h2 style="text-align: center;">${greeting}, ${username}!</h2>
      <p style="font-size: 16px; color: #555; text-align: center;">${message}</p>
      <div style="text-align: center; margin: 30px 0;">
        <div style="font-size: 32px; letter-spacing: 8px; font-weight: bold; color: #2e6c80;">${otp}</div>
      </div>
      <p style="font-size: 14px; color: #777; text-align: center;">${note}</p>
      <p style="text-align: center; font-size: 12px; color: #aaa; margin-top: 40px;">
        © 2025 Hamro Bus. All rights reserved.
      </p>
    </div>
  </div>
`;

const verify_account_boilerplate = (otp, username) => getTemplate(
  otp,
  username,
  "Welcome",
  "Thank you for registering with HamroBus. Please verify your account using the OTP below:",
  "This OTP is valid for 5 minutes. If you did not request this, please ignore this email."
);

const reset_password_boilerplate = (otp, username) => getTemplate(
  otp,
  username,
  "Hello",
  "We received a request to reset your password. Use the OTP below to proceed:",
  "This OTP is valid for 5 minutes. If you did not request this, please ignore this email."
);

const verify_login_boilerplate = (otp, username) => getTemplate(
  otp,
  username,
  "Welcome back",
  "Use the OTP below to complete your login:",
  "This OTP is valid for 5 minutes. If you did not attempt to log in, please secure your account."
);
const missed_trip_apology_boilerplate = ({
  passengerName,
  bookingCode,
  routeName,
  scheduleStart,
  scheduleEnd,
}) => `
  <div style="${baseStyles}">
    <div style="${cardStyles}">
      <div style="text-align: center;">
        <img src="cid:hamrobuslogo" alt="HamroBus Logo" style="width: 120px; margin-bottom: 20px;" />
      </div>
      <h2 style="text-align: center;">We are sorry, ${passengerName}</h2>
      <p style="font-size: 16px; color: #555; text-align: center;">
        Your trip could not be started by the driver within scheduled time.
      </p>
      <div style="margin: 20px 0; font-size: 14px; color: #333;">
        <p><strong>Booking:</strong> ${bookingCode}</p>
        <p><strong>Route:</strong> ${routeName}</p>
        <p><strong>Scheduled Time:</strong> ${scheduleStart} - ${scheduleEnd}</p>
      </div>
      <p style="font-size: 14px; color: #777; text-align: center;">
        We sincerely apologize for the inconvenience. Your booking has been cancelled.
      </p>
      <p style="text-align: center; font-size: 12px; color: #aaa; margin-top: 40px;">
        © 2025 Hamro Bus. All rights reserved.
      </p>
    </div>
  </div>
`;

module.exports = {
  verify_account_boilerplate,
  reset_password_boilerplate,
  verify_login_boilerplate,
  missed_trip_apology_boilerplate
};
