const jwt = require('jsonwebtoken');
const Driver = require('../models/driver.model');
const Admin = require('../models/admin.model');

const chatAuth = async (req, res, next) => {
  try {
    const authHeaderToken = req.headers.authorization?.split(' ')[1];
    const cookieToken = req.cookies?.access_token;
    const token = authHeaderToken || cookieToken;

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Token format is { id: userId, email: ... }
    // We need to determine if it's a driver or admin
    if (!decoded.id) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    // Try to find as driver first
    let driver = await Driver.findById(decoded.id);
    if (driver) {
      req.user = {
        userId: decoded.id,
        userType: 'driver',
        driver
      };
      return next();
    }

    // Try to find as admin
    let admin = await Admin.findById(decoded.id);
    if (admin) {
      req.user = {
        userId: decoded.id,
        userType: 'admin',
        admin
      };
      return next();
    }

    // User not found
    return res.status(401).json({ message: 'User not found' });

  } catch (error) {
    console.error('Chat auth error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = chatAuth;
