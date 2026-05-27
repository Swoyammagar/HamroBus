const jwt = require("jsonwebtoken");
const Driver = require("../models/driver.model");
const Passenger = require("../models/passenger.model");

async function authenticateDriver(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: "Access token missing",
        code: "NO_TOKEN"
      });
    }

    const token = authHeader.split(' ')[1];

    let data;
    try {
      data = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: "Token expired",
          code: "TOKEN_EXPIRED",
          message: "Please refresh your token using /auth/refresh-mobile"
        });
      }
      return res.status(403).json({
        success: false,
        error: "Invalid token",
        code: "INVALID_TOKEN"
      });
    }

    req.userId = data.id || data._id; // Handle both id and _id cases

    const driver = await Driver.findById(req.userId);
    if (!driver) {
      return res.status(401).json({
        success: false,
        error: "Driver not found",
        code: "DRIVER_NOT_FOUND"
      });
    }

    req.user = {
      id: driver._id,
      email: driver.email,
      firstName: driver.firstName,
      lastName: driver.lastName,
      profileImgUrl: driver.profileImgUrl
    };

    next();
  } catch (err) {
    console.error("Driver auth error:", err);
    return res.status(403).json({
      success: false,
      error: "Authentication failed",
      code: "AUTH_FAILED"
    });
  }
}

async function authenticatePassenger(req, res, next) {
  try {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: "Access token missing",
        code: "NO_TOKEN"
      });
    }

    const token = authHeader.split(' ')[1];

    let data;
    try {
      data = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: "Token expired",
          code: "TOKEN_EXPIRED",
          message: "Please refresh your token using /auth/refresh-mobile"
        });
      }
      return res.status(403).json({
        success: false,
        error: "Invalid token",
        code: "INVALID_TOKEN"
      });
    }

    req.userId = data.id || data._id; // Handle both id and _id cases

    const passenger = await Passenger.findById(req.userId);
    if (!passenger) {
      return res.status(401).json({
        success: false,
        error: "Passenger not found",
        code: "PASSENGER_NOT_FOUND"
      });
    }

    req.user = {
      id: passenger._id,
      email: passenger.email,
      firstName: passenger.firstName,
      lastName: passenger.lastName,
      profileImgUrl: passenger.profileImgUrl
    };

    next();
  } catch (err) {
    console.error("Passenger auth error:", err);
    return res.status(403).json({
      success: false,
      error: "Authentication failed",
      code: "AUTH_FAILED"
    });
  }
}

module.exports = {
  authenticateDriver,
  authenticatePassenger
};
