const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");

/**
 * @deprecated Use authenticateAdmin from admin.auth.middleware.js instead
 * This middleware is kept for backward compatibility
 */
async function authenticateUser(req, res, next) {
  try {
    // 1️⃣ Read token from cookies
    const token = req.cookies.access_token;

    if (!token) {
      return res.status(401).json({ error: "Access token missing" });
    }

    // 2️⃣ Verify token
    const data = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = data.id;

    const user = await Admin.findById(req.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // ✅ Add role verification
    if (user.role !== 'admin') {
      return res.status(403).json({ 
        error: "Access denied",
        message: "Admin privileges required" 
      });
    }

    req.user = {
      id: user._id,
      role: user.role,
      permissions: user.permissions,
      fullname: user.fullname,
      email: user.email,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expired" });
    }
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

module.exports = authenticateUser;