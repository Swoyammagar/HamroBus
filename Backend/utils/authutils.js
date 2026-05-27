const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
};

const comparePassword = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

const generateToken = (admin) => {
  const payload = { id: admin._id, email: admin.email  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' });
}

const generateRefreshToken = (admin) => {
  const payload = { id: admin._id, sid: crypto.randomUUID() };
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '30d' });
}

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
}

const decodeRefreshToken = (token) => jwt.decode(token);

const getRefreshTokenExpiry = (token) => {
  const decoded = jwt.decode(token);
  if (!decoded?.exp) return null;
  return new Date(decoded.exp * 1000);
};

const getAdminRefreshTokens = (admin) => {
  const refreshTokens = Array.isArray(admin?.refreshTokens) ? admin.refreshTokens : [];
  return refreshTokens
    .map((entry) => typeof entry === 'string' ? entry : entry?.token)
    .filter(Boolean);
};

const hasAdminRefreshToken = (admin, token) => (
  !!token && (
    getAdminRefreshTokens(admin).includes(token) ||
    admin?.refreshToken === token
  )
);

const addAdminRefreshToken = (admin, token, options = {}) => {
  if (!admin || !token) return;
  const existingTokens = getAdminRefreshTokens(admin);
  admin.refreshTokens = (admin.refreshTokens || []).filter((entry) => {
    const existingToken = typeof entry === 'string' ? entry : entry?.token;
    return existingToken && existingToken !== token;
  });

  admin.refreshTokens.push({
    token,
    createdAt: new Date(),
    expiresAt: options.expiresAt || getRefreshTokenExpiry(token),
    deviceId: options.deviceId || null,
  });

  if (admin.refreshToken === token || existingTokens.includes(token)) {
    admin.refreshToken = null;
  }
};

const removeAdminRefreshToken = (admin, token) => {
  if (!admin || !token) return;
  admin.refreshTokens = (admin.refreshTokens || []).filter((entry) => {
    const existingToken = typeof entry === 'string' ? entry : entry?.token;
    return existingToken && existingToken !== token;
  });
  if (admin.refreshToken === token) {
    admin.refreshToken = null;
  }
};

const pruneExpiredAdminRefreshTokens = (admin, now = new Date()) => {
  if (!admin) return;
  admin.refreshTokens = (admin.refreshTokens || []).filter((entry) => {
    const token = typeof entry === 'string' ? entry : entry?.token;
    const expiresAt = typeof entry === 'string' ? getRefreshTokenExpiry(token) : entry?.expiresAt;
    return token && (!expiresAt || new Date(expiresAt) > now);
  });
};

/**
 * Check if a phone number is unique for a user model
 * @param {Object} Model - The Mongoose model to check against
 * @param {string} phoneNumber - Phone number to check
 * @param {string} userId - User ID to exclude from the check (for updates)
 * @returns {Promise<boolean>} - True if phone number is unique, false otherwise
 */
const isPhoneNumberUnique = async (Model, phoneNumber, userId = null) => {
  try {
    const query = { phoneNumber };
    if (userId) {
      query._id = { $ne: userId };
    }
    const existingUser = await Model.findOne(query);
    return !existingUser;
  } catch (error) {
    console.error("Error checking phone uniqueness:", error);
    throw error;
  }
};

/**
 * Check if a license number is unique for drivers
 * @param {string} licenseNo - License number to check
 * @param {string} driverId - Driver ID to exclude from the check (for updates)
 * @returns {Promise<boolean>} - True if license number is unique, false otherwise
 */
const isLicenseNumberUnique = async (licenseNo, driverId = null) => {
  try {
    const Driver = require('../models/driver.model');
    const query = { licenseNo };
    if (driverId) {
      query._id = { $ne: driverId };
    }
    const existingDriver = await Driver.findOne(query);
    return !existingDriver;
  } catch (error) {
    console.error("Error checking license uniqueness:", error);
    throw error;
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  decodeRefreshToken,
  getRefreshTokenExpiry,
  getAdminRefreshTokens,
  hasAdminRefreshToken,
  addAdminRefreshToken,
  removeAdminRefreshToken,
  pruneExpiredAdminRefreshTokens,
  hashPassword,
  comparePassword,
  isPhoneNumberUnique,
  isLicenseNumberUnique,
};
