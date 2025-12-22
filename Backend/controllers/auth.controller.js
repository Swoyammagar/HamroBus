const Admin = require('../models/admin.model');
const User = require('../models/user.model');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/authutils');

// Accepts a refresh token and issues a new access token
const refreshAccessToken = async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return res.status(400).json({ message: 'Refresh token required' });

  const payload = verifyRefreshToken(refreshToken);
  if (!payload) return res.status(403).json({ message: 'Invalid refresh token' });

  // Check both admins and users for the token (depends on which route called it)
  const userId = payload.id;
  let user = await Admin.findById(userId);
  let isAdmin = true;
  if (!user) {
    user = await User.findById(userId);
    isAdmin = false;
  }
  if (!user || user.refreshToken !== refreshToken) {
    return res.status(403).json({ message: 'Refresh token not recognized' });
  }

  // Issue new access token
  const accessToken = generateToken(user);
  
  // Set new access token in httpOnly cookie
  res.cookie('access_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
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
      if (!user) user = await User.findById(userId);
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
    sameSite: 'lax'
  });
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  
  res.status(200).json({ message: 'Logged out' });
};

module.exports = { refreshAccessToken, logout };
