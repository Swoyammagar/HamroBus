const User = require("../models/admin.model");

const currentUser = async (req, res) => {
  try {
    const userId = req.userId; // This comes from the auth middleware
    const user = await User.findById(userId).select('-password -otp');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        fullname: user.fullname,
        email: user.email
      }
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  currentUser
};
