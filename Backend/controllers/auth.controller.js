const Admin = require('../models/admin.model');
const Driver = require('../models/driver.model');
const Passenger = require('../models/passenger.model');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/authutils');
const { authCookieOptions, clearAuthCookieOptions } = require('../utils/cookieOptions');

// Accepts a refresh token and issues a new access token
const refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      console.warn('[Auth] Refresh token missing from cookies');
      return res.status(401).json({ message: 'Refresh token required' });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      console.warn('[Auth] Invalid refresh token');
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    // Check admins, drivers, and passengers for the token
    const userId = payload.id;
    let user = await Admin.findById(userId);
    if (!user) user = await Driver.findById(userId);
    if (!user) user = await Passenger.findById(userId);
    
    if (!user) {
      console.warn(`[Auth] User not found for ID: ${userId}`);
      return res.status(401).json({ message: 'User not found' });
    }

    // Allow refresh if:
    // 1. Token in DB matches OR
    // 2. No token in DB (for backward compatibility with users who logged in before this fix)
    if (user.refreshToken && user.refreshToken !== refreshToken) {
      console.warn(`[Auth] Refresh token mismatch for user ${userId}`);
      return res.status(401).json({ message: 'Refresh token mismatch' });
    }

    // Issue new access token
    const accessToken = generateToken(user);
    
    // Set new access token in httpOnly cookie
    res.cookie('access_token', accessToken, authCookieOptions(15 * 60 * 1000));
    res.cookie('refresh_token', refreshToken, authCookieOptions(7 * 24 * 60 * 60 * 1000));
    
    res.status(200).json({ success: true, message: 'Token refreshed' });
  } catch (error) {
    console.error('[Auth] Refresh token error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Logout: clear stored refresh token and cookies
const logout = async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  if (refreshToken) {
    const payload = verifyRefreshToken(refreshToken);
    if (payload) {
      const userId = payload.id;
      let user = await Admin.findById(userId);
      if (!user) user = await Driver.findById(userId);
      if (!user) user = await Passenger.findById(userId);
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }
  }
  
  // Clear cookies
  res.clearCookie('access_token', clearAuthCookieOptions());
  res.clearCookie('refresh_token', clearAuthCookieOptions());
  
  res.status(200).json({ message: 'Logged out' });
};

// ✅ NEW: Mobile-specific refresh token (receives token in body, returns JSON)
const refreshAccessTokenMobile = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }

    const userId = payload.id;
    let user = await Admin.findById(userId);
    if (!user) user = await Driver.findById(userId);
    if (!user) user = await Passenger.findById(userId);

    if (!user || user.refreshToken !== refreshToken) {
      return res.status(403).json({ success: false, message: 'Refresh token not recognized' });
    }

    // Issue new access token
    const accessToken = generateToken(user);
    res.status(200).json({ 
      success: true, 
      accessToken,
      message: 'Token refreshed' 
    });
  } catch (error) {
    console.error('Mobile token refresh error:', error);
    res.status(500).json({ success: false, message: 'Token refresh failed' });
  }
};

// ✅ NEW: Mobile-specific logout (receives token in body)
const logoutMobile = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Refresh token required' 
      });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid refresh token' 
      });
    }

    const userId = payload.id;
    let user = await Admin.findById(userId);
    if (!user) user = await Driver.findById(userId);
    if (!user) user = await Passenger.findById(userId);

    if (user) {
      // Clear the refresh token from database
      user.refreshToken = null;
      await user.save();
    }

    res.status(200).json({ 
      success: true, 
      message: 'Logged out successfully' 
    });

  } catch (error) {
    console.error('Mobile logout error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Logout failed' 
    });
  }
};


module.exports = { refreshAccessToken, logout, refreshAccessTokenMobile, logoutMobile };
