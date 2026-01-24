const User = require('../models/user.model');
const TempUser = require('../models/tempUser.model');
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

/**
 * ✅ FIXED: Uses TempUser model to prevent verified user deletion
 */
const requestSignupOTP = async (req, res) => {
  const { email, role } = req.body;

  try {
    // Check if user already exists and is verified
    const existingUser = await User.findOne({ email, isEmailVerified: true });

    // 🚫 Case 1: User already has this role
    if (existingUser && existingUser.roles?.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `User already registered as ${role}`,
      });
    }

    // 🚫 Case 2: User already has both roles
    if (existingUser && 
        existingUser.roles?.includes("driver") && 
        existingUser.roles?.includes("passenger")) {
      return res.status(400).json({
        success: false,
        message: "User already registered as both driver and passenger",
      });
    }

    // ✅ Generate and send OTP using TempUser model
    const otp = generateOTP().otp;
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    // Check if temp user already exists for this email
    let tempUser = await TempUser.findOne({ email });
    
    if (tempUser) {
      // Update existing temp user
      tempUser.otp = otp;
      tempUser.otpExpiresAt = expiry;
      tempUser.role = role;
    } else {
      // Create new temp user
      tempUser = new TempUser({
        email,
        otp,
        otpExpiresAt: expiry,
        role
      });
    }

    await tempUser.save();

    await sendVerificationEmail(email, "User", otp);

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

/**
 * ✅ FIXED: Uses TempUser model for verification
 */
const verifySignupOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    // Look in TempUser collection
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
    
    // ✅ OTP verified - now check if user exists
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user with verified email
      user = new User({
        email,
        isEmailVerified: true,
        roles: []
      });
    } else {
      // Mark existing user as verified (for multi-role registration)
      user.isEmailVerified = true;
    }
    
    await user.save();
    
    // Delete temp user after successful verification
    await TempUser.deleteOne({ email });
    
    res.status(200).json({
      status: 'success',
      message: "Account verified successfully. Please proceed to complete your registration.",
      email: user.email,
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

/**
 * ✅ FIXED: Phone numbers are now globally unique across all users
 */
const phoneExists = async (req, res) => {
  const { phoneNumber, email } = req.body;
  console.log("Phone exists route hit:", phoneNumber, "for email:", email);

  try {
    // Check if phone number exists for ANY verified user
    const userWithPhone = await User.findOne({ phoneNumber, isEmailVerified: true });
    
    if (!userWithPhone) {
      // Phone number doesn't exist - allow
      return res.status(200).json({ exists: false });
    }
    
    // If phone belongs to the current user (email matches), allow it
    if (userWithPhone.email === email) {
      return res.status(200).json({ exists: false });
    }
    
    // Phone number belongs to a different user - block
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
