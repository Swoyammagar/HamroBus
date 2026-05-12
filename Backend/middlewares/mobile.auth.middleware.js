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
      return res.status(401).json({ 
        success: false,
        error: "Access token missing",
        code: "NO_TOKEN"
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
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

// Middleware for authenticating passengers
// Expects token in Authorization header: "Bearer <token>"
async function authenticatePassenger(req, res, next) {
  try {
    console.log('\n=== AUTHENTICATE PASSENGER MIDDLEWARE ===');
    console.log('Method:', req.method);
    console.log('URL:', req.originalUrl);
    console.log('Path:', req.path);
    
    // Read token from Authorization header
    const authHeader = req.headers.authorization;
    console.log('Authorization header:', authHeader ? `Present (${authHeader.substring(0, 30)}...)` : 'MISSING');
    console.log('All headers keys:', Object.keys(req.headers));

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('[Passenger Auth] REJECTED: Missing or invalid header format');
      return res.status(401).json({ 
        success: false,
        error: "Access token missing",
        code: "NO_TOKEN"
      });
    }

    const token = authHeader.split(' ')[1];
    console.log('Token extracted:', token.substring(0, 20) + '...');

    // Verify token
    let data;
    try {
      data = jwt.verify(token, process.env.JWT_SECRET);
      console.log('[Passenger Auth] Token verified for user ID:', data.id);
    } catch (err) {
      console.log('[Passenger Auth] Token verification failed:', err.name, err.message);
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
    console.log('Looking for passenger with ID:', req.userId);

    const passenger = await Passenger.findById(req.userId);
    if (!passenger) {
      console.log('[Passenger Auth] Passenger not found for user:', req.userId);
      return res.status(401).json({ 
        success: false,
        error: "Passenger not found",
        code: "PASSENGER_NOT_FOUND"
      });
    }

    console.log('Passenger found:', passenger._id);
    req.user = {
      id: passenger._id,
      email: passenger.email,
      firstName: passenger.firstName,
      lastName: passenger.lastName,
      profileImgUrl: passenger.profileImgUrl
    };

    console.log('req.user set to:', req.user);
    console.log('[Passenger Auth] Authentication SUCCESSFUL, calling next()');
    console.log('=== END MIDDLEWARE ===\n');
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
