const { otpEmail, missedTripApologyEmail } = require('./emailTemplates');

const verify_account_boilerplate = (otp, username) =>
  otpEmail({
    title: 'Verify your HamroBus account',
    greeting: `Welcome, ${username || 'there'}!`,
    message: 'Thank you for registering with HamroBus. Use the verification code below to confirm your email address.',
    otp,
    note: 'This OTP is valid for 5 minutes. If you did not request this, you can safely ignore this email.',
  });

const reset_password_boilerplate = (otp, username) =>
  otpEmail({
    title: 'Reset your HamroBus password',
    greeting: `Hello, ${username || 'there'}.`,
    message: 'We received a request to reset your password. Use the OTP below to continue.',
    otp,
    note: 'This OTP is valid for 5 minutes. If you did not request a password reset, please ignore this email and keep your account credentials private.',
  });

const verify_login_boilerplate = (otp, username) =>
  otpEmail({
    title: 'Confirm your HamroBus login',
    greeting: `Welcome back, ${username || 'there'}.`,
    message: 'Use the OTP below to complete your login.',
    otp,
    note: 'This OTP is valid for 5 minutes. If you did not attempt to log in, please reset your password or contact support.',
  });

const missed_trip_apology_boilerplate = (payload) =>
  missedTripApologyEmail(payload);

module.exports = {
  verify_account_boilerplate,
  reset_password_boilerplate,
  verify_login_boilerplate,
  missed_trip_apology_boilerplate,
};
