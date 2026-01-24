const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");

/**
 * Middleware to authenticate admin users via cookies
 * Validates JWT and verifies admin role
 */
async function authenticateAdmin(req, res, next) {
  try {
    // 1️⃣ Read token from cookies
    const token = req.cookies.access_token;

    if (!token) {
      return res.status(401).json({ 
        error: "Access token missing",
        message: "Please login to continue" 
      });
    }

    // 2️⃣ Verify token
    const data = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = data.id;

    // 3️⃣ Fetch admin from database
    const admin = await Admin.findById(req.userId);
    
    if (!admin) {
      return res.status(401).json({ error: "Admin not found" });
    }

    // 4️⃣ ✅ NEW: Verify user has admin role
    if (admin.role !== 'admin') {
      return res.status(403).json({ 
        error: "Access denied",
        message: "Admin privileges required" 
      });
    }

    // 5️⃣ Attach admin info to request
    req.user = {
      id: admin._id,
      role: admin.role,
      fullname: admin.fullname,
      email: admin.email,
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: "Token expired",
        message: "Please refresh your token or login again" 
      });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        error: "Invalid token",
        message: "Token verification failed" 
      });
    }
    return res.status(403).json({ error: "Authentication failed" });
  }
}

/**
 * Optional: Super admin check for critical operations
 */
function isSuperAdmin(req, res, next) {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ 
      error: "Access denied",
      message: "Super admin privileges required" 
    });
  }
  next();
}

module.exports = { authenticateAdmin, isSuperAdmin };