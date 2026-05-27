const Driver = require('../models/driver.model');
const Passenger = require('../models/passenger.model');
const TempUser = require('../models/tempUser.model');
const { generateOTP } = require('../utils/OTPutils');
const { sendPasswordResetEmail , sendVerificationEmail} = require('../utils/OTPutils');
const { hashPassword } = require('../utils/authutils');
const bcrypt = require('bcrypt');

const requestPasswordReset = async (req, res) => {
  const { email, role } = req.body;

  try {
    let user;
    if (role === 'driver') {
      user = await Driver.findOne({ email });
    } else if (role === 'passenger') {
      user = await Passenger.findOne({ email });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      });
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const otp = generateOTP().otp;
    user.otp = otp;
    await user.save();
    const fullName = `${user.firstName} ${user.lastName}`;
    await sendPasswordResetEmail(email, fullName, otp);

    res.status(200).json({
      success: true,
      message: "OTP sent to your email for password reset",
    });

  } catch (error) {
    console.error("Error requesting password reset:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

/**
 * Step 2: Verify OTP & Reset Password
 */
const resetPassword = async (req, res) => {
  const { email, newPassword, role } = req.body;

  try {
    let user;
    if (role === 'driver') {
      user = await Driver.findOne({ email });
    } else if (role === 'passenger') {
      user = await Passenger.findOne({ email });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      });
    }

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const verifyOTPUser = async (req, res) => {
  const { email, otp, role } = req.body;
  try {
    let user;
    if (role === 'driver') {
      user = await Driver.findOne({ email });
    } else if (role === 'passenger') {
      user = await Passenger.findOne({ email });
    } else {
      return res.status(400).json({
        status: 'error',
        message: "Invalid role specified",
        error: 'INVALID_ROLE'
      });
    }

    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: "User not found",
        error: 'USER_NOT_FOUND'
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        status: 'error',
        message: "Invalid OTP",
        error: 'INVALID_OTP'
      });
    }

    user.passwordResetVerified = true;
    user.otp = null;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: "Account verified successfully. Please log in.",
      email: user.email
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({
      status: 'error',
      message: "Server error",
      error: 'SERVER_ERROR'
    });
  }
};

const requestSignupOTP = async (req, res) => {
  const { email, role } = req.body;

  try {
    let existingUser;
    if (role === 'driver') {
      existingUser = await Driver.findOne({ email });
    } else if (role === 'passenger') {
      existingUser = await Passenger.findOne({ email });
    } else {
      return res.status(400).json({
        success: false,
        message: "Invalid role specified",
      });
    }

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `${role.charAt(0).toUpperCase() + role.slice(1)} with this email already exists`,
      });
    }

    const otp = generateOTP().otp;
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    let tempUser = await TempUser.findOne({ email });

    if (tempUser) {
      tempUser.otp = otp;
      tempUser.otpExpiresAt = expiry;
      tempUser.role = role;
    } else {
      tempUser = new TempUser({
        email,
        otp,
        otpExpiresAt: expiry,
        role
      });
    }

    await tempUser.save();

    const emailResult = await sendVerificationEmail(email, "User", otp);

    if (!emailResult?.success) {
      return res.status(502).json({
        success: false,
        message: "OTP could not be sent to email. Please try again.",
        error: emailResult?.error || "EMAIL_DELIVERY_FAILED",
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP sent to your email for account verification",
    });

  } catch (error) {
    console.error("Error requesting signup OTP:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const verifySignupOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const tempUser = await TempUser.findOne({ email });
    if (!tempUser) {
      return res.status(400).json({
        status: 'error',
        message: "OTP request not found or expired",
        error: 'EMAIL_NOT_FOUND'
      });
    }

    if (tempUser.otpExpiresAt < new Date()) {
      return res.status(400).json({
        error: 'OTP_EXPIRED',
        message: "OTP expired"
      });
    }

    if (tempUser.otp !== otp) {
      return res.status(400).json({
        status: 'error',
        message: "Invalid OTP",
        error: 'INVALID_OTP'
      });
    }


    await TempUser.deleteOne({ email });

    res.status(200).json({
      status: 'success',
      message: "Account verified successfully. Please proceed to complete your registration.",
      email: email,
      role: tempUser.role
    });
  } catch (error) {
    console.error("Error verifying signup OTP:", error);
    res.status(500).json({
      status: 'error',
      message: "Server error",
      error: 'SERVER_ERROR'
    });
  }
};


const phoneExists = async (req, res) => {
  const { phoneNumber, email } = req.body;

  try {
    const driverWithPhone = await Driver.findOne({ phoneNumber });

    const passengerWithPhone = await Passenger.findOne({ phoneNumber });

    if (!driverWithPhone && !passengerWithPhone) {
      return res.status(200).json({ exists: false });
    }

    if ((driverWithPhone && driverWithPhone.email === email) ||
        (passengerWithPhone && passengerWithPhone.email === email)) {
      return res.status(200).json({ exists: false });
    }

    return res.status(200).json({ exists: true });

  } catch (error) {
    console.error("Error checking phone number existence:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  requestPasswordReset,
  resetPassword,
  verifyOTPUser,
  requestSignupOTP,
  verifySignupOTP,
  phoneExists,
};
