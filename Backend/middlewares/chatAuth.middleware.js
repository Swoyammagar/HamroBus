const jwt = require('jsonwebtoken');
const Driver = require('../models/driver.model');
const Admin = require('../models/admin.model');

const chatAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Determine if user is driver or admin based on token
    if (decoded.driverId) {
      const driver = await Driver.findById(decoded.driverId);
      if (!driver) {
        return res.status(401).json({ message: 'Driver not found' });
      }
      req.user = {
        userId: decoded.driverId,
        userType: 'driver',
        driver
      };
    } else if (decoded.adminId) {
      const admin = await Admin.findById(decoded.adminId);
      if (!admin) {
        return res.status(401).json({ message: 'Admin not found' });
      }
      req.user = {
        userId: decoded.adminId,
        userType: 'admin',
        admin
      };
    } else {
      return res.status(401).json({ message: 'Invalid token' });
    }

    next();
  } catch (error) {
    console.error('Chat auth error:', error);
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

module.exports = chatAuth;
