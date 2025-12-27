const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

// Middleware for authenticating mobile users (drivers and passengers)
// Expects token in Authorization header: "Bearer <token>"
async function authenticateMobileUser(req, res, next) {
  try {
    // Read token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Access token missing" });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const data = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = data.id;

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = {
      id: user._id,
      roles: user.roles,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

// Middleware to check if user is a driver
function isDriver(req, res, next) {
  if (!req.user.roles.includes('driver')) {
    return res.status(403).json({ error: "Access denied. Driver role required." });
  }
  next();
}


// Middleware to check if user is a passenger
function isPassenger(req, res, next) {
  if (!req.user.roles.includes('passenger')) {
    return res.status(403).json({ error: "Access denied. Passenger role required." });
  }
  next();
}

module.exports = { 
  authenticateMobileUser, 
  isDriver, 
  isPassenger 
};
