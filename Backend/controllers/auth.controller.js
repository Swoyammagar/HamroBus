const Admin = require('../models/admin.model');
const Driver = require('../models/driver.model');
const Passenger = require('../models/passenger.model');
const {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  decodeRefreshToken,
  hasAdminRefreshToken,
  addAdminRefreshToken,
  removeAdminRefreshToken,
  pruneExpiredAdminRefreshTokens,
} = require('../utils/authutils');
const { authCookieOptions, clearAuthCookieOptions } = require('../utils/cookieOptions');

const removeUnusableAdminRefreshToken = async (refreshToken) => {
  const decoded = decodeRefreshToken(refreshToken);
  if (!decoded?.id) return;

  const admin = await Admin.findById(decoded.id).select('+refreshToken +refreshTokens');
  if (!admin || !hasAdminRefreshToken(admin, refreshToken)) return;

  removeAdminRefreshToken(admin, refreshToken);
  pruneExpiredAdminRefreshTokens(admin);
  await admin.save();
};

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
      await removeUnusableAdminRefreshToken(refreshToken);
      return res.status(401).json({ message: 'Invalid refresh token' });
    }

    const userId = payload.id;
    let user = await Admin.findById(userId).select('+refreshToken +refreshTokens');
    if (!user) user = await Driver.findById(userId);
    if (!user) user = await Passenger.findById(userId);

    if (!user) {
      console.warn(`[Auth] User not found for ID: ${userId}`);
      return res.status(401).json({ message: 'User not found' });
    }

    const isAdmin = user.constructor.modelName === 'Admin';
    if (isAdmin) {
      if (!hasAdminRefreshToken(user, refreshToken)) {
        console.warn(`[Auth] Refresh token not recognized for admin ${userId}`);
        return res.status(401).json({ message: 'Refresh token not recognized' });
      }
    } else if (user.refreshToken && user.refreshToken !== refreshToken) {
      console.warn(`[Auth] Refresh token mismatch for user ${userId}`);
      return res.status(401).json({ message: 'Refresh token mismatch' });
    }

    const accessToken = generateToken(user);
    let nextRefreshToken = refreshToken;
    if (isAdmin) {
      nextRefreshToken = generateRefreshToken(user);
      pruneExpiredAdminRefreshTokens(user);
      removeAdminRefreshToken(user, refreshToken);
      addAdminRefreshToken(user, nextRefreshToken);
      await user.save();
    }

    res.cookie('access_token', accessToken, authCookieOptions(15 * 60 * 1000));
    res.cookie('refresh_token', nextRefreshToken, authCookieOptions(7 * 24 * 60 * 60 * 1000));

    res.status(200).json({ success: true, message: 'Token refreshed' });
  } catch (error) {
    console.error('[Auth] Refresh token error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const logout = async (req, res) => {
  const refreshToken = req.cookies.refresh_token;
  if (refreshToken) {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      await removeUnusableAdminRefreshToken(refreshToken);
    } else {
      const userId = payload.id;
      let user = await Admin.findById(userId).select('+refreshToken +refreshTokens');
      if (!user) user = await Driver.findById(userId);
      if (!user) user = await Passenger.findById(userId);
      if (user) {
        if (user.constructor.modelName === 'Admin') {
          removeAdminRefreshToken(user, refreshToken);
        } else {
          user.refreshToken = null;
        }
        await user.save();
      }
    }
  }

  res.clearCookie('access_token', clearAuthCookieOptions());
  res.clearCookie('refresh_token', clearAuthCookieOptions());

  res.status(200).json({ message: 'Logged out' });
};

const refreshAccessTokenMobile = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required' });
    }

    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      await removeUnusableAdminRefreshToken(refreshToken);
      return res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }

    const userId = payload.id;
    let user = await Admin.findById(userId).select('+refreshToken +refreshTokens');
    if (!user) user = await Driver.findById(userId);
    if (!user) user = await Passenger.findById(userId);

    if (!user) {
      return res.status(403).json({ success: false, message: 'Refresh token not recognized' });
    }

    const isAdmin = user.constructor.modelName === 'Admin';
    if (isAdmin) {
      if (!hasAdminRefreshToken(user, refreshToken)) {
        return res.status(403).json({ success: false, message: 'Refresh token not recognized' });
      }
    } else if (user.refreshToken !== refreshToken) {
      return res.status(403).json({ success: false, message: 'Refresh token not recognized' });
    }

    const accessToken = generateToken(user);
    let nextRefreshToken = refreshToken;
    if (isAdmin) {
      nextRefreshToken = generateRefreshToken(user);
      pruneExpiredAdminRefreshTokens(user);
      removeAdminRefreshToken(user, refreshToken);
      addAdminRefreshToken(user, nextRefreshToken);
      await user.save();
    }

    res.status(200).json({
      success: true,
      accessToken,
      refreshToken: nextRefreshToken,
      message: 'Token refreshed'
    });
  } catch (error) {
    console.error('Mobile token refresh error:', error);
    res.status(500).json({ success: false, message: 'Token refresh failed' });
  }
};

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
      await removeUnusableAdminRefreshToken(refreshToken);
      return res.status(403).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const userId = payload.id;
    let user = await Admin.findById(userId).select('+refreshToken +refreshTokens');
    if (!user) user = await Driver.findById(userId);
    if (!user) user = await Passenger.findById(userId);

    if (user) {
      if (user.constructor.modelName === 'Admin') {
        removeAdminRefreshToken(user, refreshToken);
      } else {
        user.refreshToken = null;
      }
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
