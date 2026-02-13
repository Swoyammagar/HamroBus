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
  rejectDriver,
  getAllDrivers
} = require('../controllers/driver.controller');
const { authenticateAdmin } = require('../middlewares/admin.auth.middleware'); // ✅ Updated import
const { authenticateDriver } = require('../middlewares/mobile.auth.middleware');

// Public routes
router.post('/register', registerDriver);
router.post('/login', loginDriver);

// Admin-only routes ✅ Now properly protected with role verification
router.get('/pending', authenticateAdmin, getPendingDrivers);
router.get('/allDrivers', authenticateAdmin, getAllDrivers);
router.post('/approve/:driverId', authenticateAdmin, approveDriver);
router.post('/reject/:driverId', authenticateAdmin, rejectDriver);

// Driver-only routes
router.get('/profile', authenticateDriver, getDriverProfile);
router.post('/location', authenticateDriver, updateDriverLocation);

// Public route (you might want to protect this too)
router.get('/location/:driverId', getDriverLocationHistory);

module.exports = router;