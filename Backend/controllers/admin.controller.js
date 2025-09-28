const Admin = require('../models/admin.model');
const bcrypt = require('bcrypt');
const { generateToken } = require('../utils/authutils');

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
        res.status(200).json({ message: "Login successful", admin: { email: existing.email, id: existing._id } });
        const token = generateToken(existing);
        res.status(200).json({ 
            admin: { email: existing.email, id: existing._id },
            token,
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
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    const otp = generateOTP().otp;
    user.otp = otp;
    await user.save();

    await sendVerificationEmail(email, user.fullname, otp);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "OTP sent to your email for password reset",
    });

  } catch (error) {
    console.error("Error requesting password reset:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
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
      return res.status(StatusCodes.NOT_FOUND).json({
        success: false,
        message: "User not found",
      });
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Server error",
    });
  }
};
module.exports = { Login, requestPasswordReset, resetPassword };