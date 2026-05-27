const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");
const Driver = require("../models/driver.model");
const Passenger = require("../models/passenger.model");

/**
 * @deprecated Use authenticateAdmin from admin.auth.middleware.js instead
 * This middleware is kept for backward compatibility
 */
async function authenticateUser(req, res, next) {
  try {
    const token = req.cookies.access_token;

    if (!token) {
      return res.status(401).json({ error: "Access token missing" });
    }

    const data = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = data.id;

    const user = await Admin.findById(req.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

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

async function authUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Access token missing",
        code: "NO_TOKEN",
      });
    }

    const token = authHeader.split(" ")[1];

    let data;

    try {
      data = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired token",
        code: "INVALID_TOKEN",
      });
    }

    req.userId = data.id;
    req.userRole = data.role; // IMPORTANT (driver/passenger)

    let user =
      (await Passenger.findById(req.userId)) ||
      (await Driver.findById(req.userId));

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User not found",
        code: "USER_NOT_FOUND",
      });
    }

    req.user = {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImgUrl: user.profileImgUrl,
      role: data.role,
    };

    next();
  } catch (err) {
    console.error("Auth error:", err);
    return res.status(403).json({
      success: false,
      error: "Authentication failed",
      code: "AUTH_FAILED",
    });
  }
}

module.exports = authenticateUser;
module.exports.authUser = authUser;
