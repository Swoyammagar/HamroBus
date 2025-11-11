const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
  const payload = { id: admin._id };
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, { expiresIn: '30d' });
}

const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  } catch (err) {
    return null;
  }
}

module.exports = { generateToken, generateRefreshToken, verifyRefreshToken, hashPassword, comparePassword };