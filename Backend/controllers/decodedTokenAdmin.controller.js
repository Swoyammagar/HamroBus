const Admin = require("../models/admin.model");

/**
 * Get current authenticated admin user
 * req.user is populated by authenticateAdmin middleware
 */
const currentUser = async (req, res) => {
  try {
    // Use req.user from middleware (already verified)
    const userId = req.user.id;
    
    const admin = await Admin.findById(userId).select('-password -otp -refreshToken');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: admin._id,
        fullname: admin.fullname,
        email: admin.email,
        phone: admin.phone,
        role: admin.role, // ✅ Include role in response
        isVerified: admin.isVerified
      }
    });
  } catch (error) {
    console.error("Error fetching current admin:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  currentUser
};
