const express = require('express');
const router = express.Router();
const { 
  registerDriver, 
  loginDriver, 
  updateDriverLocation, 
  getDriverLocationHistory,
  getDriverProfile,
  getPendingDrivers,
  approveDriver,
  rejectDriver
} = require('../controllers/driver.controller');
const upload = require('../middlewares/upload');
const authenticateAdmin = require('../middlewares/auth.middleware');
const { authenticateMobileUser, isDriver } = require('../middlewares/mobile.auth.middleware');

// Public routes
router.post('/register', registerDriver);


router.post('/login', loginDriver);

// Admin-only routes
router.get('/pending', authenticateAdmin, getPendingDrivers);
router.post('/approve/:driverId', authenticateAdmin, approveDriver);
router.post('/reject/:driverId', authenticateAdmin, rejectDriver);

// Protected routes (require authentication)
router.get('/profile', authenticateMobileUser, isDriver, getDriverProfile);
router.post('/location', authenticateMobileUser, isDriver, updateDriverLocation);
router.get('/location/:driverId', getDriverLocationHistory);

module.exports = router;
