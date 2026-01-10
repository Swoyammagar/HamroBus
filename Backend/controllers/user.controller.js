const User = require('../models/user.model');
const { generateOTP } = require('../utils/OTPutils');
const { sendPasswordResetEmail , sendVerificationEmail} = require('../utils/OTPutils');
const { hashPassword } = require('../utils/authutils');
const bcrypt = require('bcrypt');

const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

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
  const { email, newPassword } = req.body;

  try {
    const user = await User.findOne({ email });

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
  const { email, otp } = req.body;
  try {
    const user = await User.findOne({ email });
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
  const { email } = req.body;
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }
    const otp = generateOTP().otp;
    let tempUser = await User.findOne({ email});
    if (!tempUser) {
      tempUser = new User({
        email,
        otp,
        firstName: "temp",
        lastName: "temp",
        password: "temp",
        phoneNumber: "temp",
        roles: [],
        isEmailVerified: false,
      });
      await tempUser.save();
    } else {
      tempUser.otp = otp;
      await tempUser.save();
    }
    const fullName = "User";
    await sendVerificationEmail(email, fullName, otp);
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
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        status: 'error',
        message: "Email not found",
        error: 'EMAIL_NOT_FOUND'
      });
    }
    if (user.otp !== otp) {
      return res.status(400).json({
        status: 'error',
        message: "Invalid OTP",
        error: 'INVALID_OTP'
      });
    }
    user.isEmailVerified = true;
    user.otp = null;
    await user.save();
    res.status(200).json({
      status: 'success',
      message: "Account verified successfully. Please proceed to complete your registration.",
      email: user.email
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
module.exports = {
  requestPasswordReset,
  resetPassword,
  verifyOTPUser,
  requestSignupOTP,
  verifySignupOTP
};