const Admin = require('../models/admin.model');
const bcrypt = require('bcrypt');
const { generateToken, generateRefreshToken } = require('../utils/authutils');
const { generateOTP } = require('../utils/OTPutils');
const { sendPasswordResetEmail } = require('../utils/OTPutils');
const { hashPassword, comparePassword } = require('../utils/authutils');
const {
  getAllPassengers,
  getPassengerDetails,
  adminDeletePassenger,
  getAllDrivers,
  getDriverDetails,
  adminDeleteDriver,
} = require('../services/adminUserManagementService');


const Login = async (req, res) =>{
    const { email, password } = req.body;
    try {
        const existing = await Admin.findOne({ email });
        if(!existing){
            return res.status(400).json({ message: "Admin does not exist" });
        }
        const isPasswordValid = await bcrypt.compare(password, existing.password);
        if(!isPasswordValid){
            return res.status(401).json({ message: "Invalid password" });
        }
    const token = generateToken(existing);
    const refreshToken = generateRefreshToken(existing);
    existing.refreshToken = refreshToken;
    await existing.save();
    
    // Set access token in httpOnly cookie
    res.cookie('access_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000 // 15 minutes
    });
    
    // Set refresh token in httpOnly cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    res.status(200).json({ 
      success: true,
      admin: { email: existing.email, id: existing._id, fullname: existing.fullname },
      accessToken: token,
      message: "Login successful"});
    }   
    catch (error) {
        console.error("Error logging in admin:", error);
        res.status(500).json({ message: "Internal server error" });
    }
}
const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await Admin.findOne({ email });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    const otp = generateOTP().otp;
    user.otp = otp;
    await user.save();

    await sendPasswordResetEmail(email, user.fullname, otp);

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
    const user = await Admin.findOne({ email });

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
    const user = await Admin.findOne({ email });
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

    user.isVerified = true;
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
 * Change admin password
 * Requires: currentPassword, newPassword, confirmPassword
 * Requires JWT authentication
 */
const changeAdminPassword = async (req, res) => {
  const adminId = req.user.id; // From JWT middleware
  const { currentPassword, newPassword, confirmPassword } = req.body;

  try {
    // Validate input
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: "Current password, new password, and confirmation are required" 
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ 
        success: false,
        message: "New passwords do not match" 
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ 
        success: false,
        message: "New password must be at least 8 characters long" 
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ 
        success: false,
        message: "New password must be different from current password" 
      });
    }

    // Find admin
    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ 
        success: false,
        message: "Admin not found" 
      });
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        success: false,
        message: "Current password is incorrect" 
      });
    }

    // Hash and save new password
    const hashedPassword = await hashPassword(newPassword);
    admin.password = hashedPassword;
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully"
    });

  } catch (error) {
    console.error("Error changing admin password:", error);
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
};

// ==================== USER MANAGEMENT FUNCTIONS ====================

/**
 * GET /admin/passengers
 * Get all passengers with pagination and search
 */
const getPassengersList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const result = await getAllPassengers(page, limit, search);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching passengers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching passengers',
      error: error.message,
    });
  }
};

/**
 * GET /admin/passengers/:passengerId
 * Get detailed information about a specific passenger
 */
const getPassengerInfo = async (req, res) => {
  try {
    const { passengerId } = req.params;

    const result = await getPassengerDetails(passengerId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching passenger info:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching passenger information',
      error: error.message,
    });
  }
};

/**
 * DELETE /admin/passengers/:passengerId
 * Delete a passenger account immediately (by admin action)
 */
const deletePassengerByAdmin = async (req, res) => {
  try {
    const { passengerId } = req.params;
    const adminId = req.admin?.id; // From auth middleware

    const result = await adminDeletePassenger(passengerId, adminId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error deleting passenger:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting passenger',
      error: error.message,
    });
  }
};

/**
 * GET /admin/drivers
 * Get all drivers with pagination and search
 */
const getDriversList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';

    const result = await getAllDrivers(page, limit, search);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching drivers',
      error: error.message,
    });
  }
};

/**
 * GET /admin/drivers/:driverId
 * Get detailed information about a specific driver
 */
const getDriverInfo = async (req, res) => {
  try {
    const { driverId } = req.params;

    const result = await getDriverDetails(driverId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching driver info:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching driver information',
      error: error.message,
    });
  }
};

/**
 * DELETE /admin/drivers/:driverId
 * Delete a driver account immediately (by admin action)
 */
const deleteDriverByAdmin = async (req, res) => {
  try {
    const { driverId } = req.params;
    const adminId = req.admin?.id; // From auth middleware

    const result = await adminDeleteDriver(driverId, adminId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting driver',
      error: error.message,
    });
  }
};

module.exports = { 
  Login, 
  requestPasswordReset, 
  resetPassword, 
  verifyOTPUser, 
  changeAdminPassword,
  // User Management
  getPassengersList,
  getPassengerInfo,
  deletePassengerByAdmin,
  getDriversList,
  getDriverInfo,
  deleteDriverByAdmin,
};