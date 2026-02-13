const jwt = require("jsonwebtoken");
const Driver = require("../models/driver.model");
const Passenger = require("../models/passenger.model");

// Middleware for authenticating drivers
// Expects token in Authorization header: "Bearer <token>"
async function authenticateDriver(req, res, next) {
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

    const driver = await Driver.findById(req.userId);
    if (!driver) {
      return res.status(401).json({ error: "Driver not found" });
    }

    req.user = {
      id: driver._id,
      email: driver.email,
      firstName: driver.firstName,
      lastName: driver.lastName
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

// Middleware for authenticating passengers
// Expects token in Authorization header: "Bearer <token>"
async function authenticatePassenger(req, res, next) {
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

    const passenger = await Passenger.findById(req.userId);
    if (!passenger) {
      return res.status(401).json({ error: "Passenger not found" });
    }

    req.user = {
      id: passenger._id,
      email: passenger.email,
      firstName: passenger.firstName,
      lastName: passenger.lastName
    };

    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

module.exports = { 
  authenticateDriver, 
  authenticatePassenger 
};
