const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");
const { generateToken, verifyRefreshToken } = require("../utils/authutils");

/**
 * Middleware to authenticate admin users via cookies
 * Validates JWT and automatically refreshes if expired
 */
async function authenticateAdmin(req, res, next) {
  console.log('🍪 Cookies received:', req.cookies);
  console.log('🔑 access_token:', req.cookies.access_token ? 'PRESENT' : 'MISSING');
  console.log('🔄 refresh_token:', req.cookies.refresh_token ? 'PRESENT' : 'MISSING');
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
    try {
      const data = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = data.id;
    } catch (err) {
      // If token expired, try to refresh it
      if (err.name === 'TokenExpiredError') {
        const refreshToken = req.cookies.refresh_token;
        
        if (!refreshToken) {
          return res.status(401).json({ 
            error: "Access token expired",
            message: "Please login again" 
          });
        }

        // Verify refresh token
        const refreshPayload = verifyRefreshToken(refreshToken);
        if (!refreshPayload) {
          return res.status(401).json({ 
            error: "Refresh token invalid or expired",
            message: "Please login again" 
          });
        }

        // Fetch admin and verify refresh token matches (or allow if not set for backward compat)
        const admin = await Admin.findById(refreshPayload.id);
        if (!admin) {
          return res.status(401).json({ 
            error: "Admin not found",
            message: "Please login again" 
          });
        }

        // Allow refresh if:
        // 1. Token in DB matches OR
        // 2. No token in DB (for backward compatibility)
        if (admin.refreshToken && admin.refreshToken !== refreshToken) {
          return res.status(401).json({ 
            error: "Refresh token mismatch",
            message: "Please login again" 
          });
        }

        // ✅ Generate new access token
        const newAccessToken = generateToken(admin);
        res.cookie('access_token', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          maxAge: 15 * 60 * 1000 // 15 minutes
        });

        req.userId = admin._id;
        req.user = {
          id: admin._id,
          role: admin.role,
          fullname: admin.fullname,
          email: admin.email,
        };

        return next();
      }
      
      // Other JWT errors
      return res.status(403).json({ 
        error: "Invalid token",
        message: "Token verification failed" 
      });
    }

    // 3️⃣ Fetch admin from database
    const admin = await Admin.findById(req.userId);
    
    if (!admin) {
      return res.status(401).json({ error: "Admin not found" });
    }

    // 4️⃣ Verify user has admin role
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
    console.error("Auth error:", err);
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