const jwt = require("jsonwebtoken");
const Admin = require("../models/admin.model");
const {
  generateToken,
  verifyRefreshToken,
} = require("../utils/authutils");
const { authCookieOptions } = require("../utils/cookieOptions");

/**
 * Middleware to authenticate admin users via cookies
 * Automatically refreshes expired/missing access tokens
 */
async function authenticateAdmin(req, res, next) {
  try {
    const token = req.cookies.access_token;
    const refreshToken = req.cookies.refresh_token;

    /**
     * No authentication at all
     */
    if (!token && !refreshToken) {
      return res.status(401).json({
        error: "Authentication required",
        message: "Please login to continue",
      });
    }

    let admin = null;

    /**
     * =========================================================
     * CASE 1:
     * ACCESS TOKEN EXISTS → VERIFY IT
     * =========================================================
     */
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findById(decoded.id);

        if (!admin) {
          return res.status(401).json({
            error: "Admin not found",
          });
        }

        /**
         * Valid access token
         */
        req.userId = admin._id;

        req.user = {
          id: admin._id,
          role: admin.role,
          fullname: admin.fullname,
          email: admin.email,
        };

        return next();
      } catch (err) {
        /**
         * If token invalid for reasons OTHER than expiration
         */
        if (err.name !== "TokenExpiredError") {
          return res.status(403).json({
            error: "Invalid token",
            message: "Token verification failed",
          });
        }

        console.log("⚠️ Access token expired. Attempting refresh...");
      }
    }

    /**
     * =========================================================
     * CASE 2:
     * TOKEN EXPIRED OR MISSING
     * TRY REFRESH TOKEN
     * =========================================================
     */

    if (!refreshToken) {
      return res.status(401).json({
        error: "Refresh token missing",
        message: "Please login again",
      });
    }

    /**
     * Verify refresh token
     */
    const refreshPayload = verifyRefreshToken(refreshToken);

    if (!refreshPayload) {
      return res.status(401).json({
        error: "Refresh token invalid or expired",
        message: "Please login again",
      });
    }

    /**
     * Fetch admin
     */
    admin = await Admin.findById(refreshPayload.id);

    if (!admin) {
      return res.status(401).json({
        error: "Admin not found",
        message: "Please login again",
      });
    }

    /**
     * Verify stored refresh token matches
     */
    if (
      admin.refreshToken &&
      admin.refreshToken !== refreshToken
    ) {
      return res.status(401).json({
        error: "Refresh token mismatch",
        message: "Please login again",
      });
    }

    /**
     * Generate new access token
     */
    const newAccessToken = generateToken(admin);

    res.cookie("access_token", newAccessToken, authCookieOptions(15 * 60 * 1000));
    res.cookie("refresh_token", refreshToken, authCookieOptions(7 * 24 * 60 * 60 * 1000));

    console.log("✅ Access token refreshed");

    /**
     * Attach user
     */
    req.userId = admin._id;

    req.user = {
      id: admin._id,
      role: admin.role,
      fullname: admin.fullname,
      email: admin.email,
    };

    return next();
  } catch (err) {
    console.error("❌ Auth middleware error:", err);

    return res.status(500).json({
      error: "Authentication failed",
    });
  }
}

/**
 * Optional super admin middleware
 */
function isSuperAdmin(req, res, next) {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({
      error: "Access denied",
      message: "Super admin privileges required",
    });
  }

  next();
}

module.exports = {
  authenticateAdmin,
  isSuperAdmin,
};
