const Admin = require('../models/admin.model');
const Driver = require('../models/driver.model');
const Passenger = require('../models/passenger.model');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/authutils');

// Accepts a refresh token and issues a new access token
const refreshAccessToken = async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return res.status(403).json({ message: 'Invalid refresh token' });

  // Check admins, drivers, and passengers for the token
  const userId = payload.id;
  let user = await Admin.findById(userId);
  if (!user) user = await Driver.findById(userId);
  if (!user) user = await Passenger.findById(userId);
  
  if (!user || user.refreshToken !== refreshToken) {
    return res.status(403).json({ message: 'Refresh token not recognized' });
  }

  // Issue new access token
  const accessToken = generateToken(user);
  
  // Set new access token in httpOnly cookie
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 15 * 60 * 1000 // 15 minutes
  });
  
  res.status(200).json({ success: true, message: 'Token refreshed' });
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
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  });
  
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
