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
  getAllDrivers,
  updateDriverProfile,
  changeDriverPassword,
  checkPhoneNumberAvailability,
  checkLicenseNumberAvailability
} = require('../controllers/driver.controller');
const { authenticateAdmin } = require('../middlewares/admin.auth.middleware');
const { authenticateDriver } = require('../middlewares/mobile.auth.middleware');
const { getMyRatingSummary, getMyReviews } = require('../controllers/driver/review.controller');

// Public routes
router.post('/register', registerDriver);
router.post('/login', loginDriver);
router.get('/check-phone-availability', checkPhoneNumberAvailability);
router.get('/check-license-availability', checkLicenseNumberAvailability);

// Admin-only routes ✅ Now properly protected with role verification
router.get('/pending', authenticateAdmin, getPendingDrivers);
router.get('/allDrivers', authenticateAdmin, getAllDrivers);
router.post('/approve/:driverId', authenticateAdmin, approveDriver);
router.post('/reject/:driverId', authenticateAdmin, rejectDriver);

// Driver-only routes
router.get('/profile', authenticateDriver, getDriverProfile);
router.put('/profile', authenticateDriver, updateDriverProfile);
router.post('/change-password', authenticateDriver, changeDriverPassword);
router.post('/location', authenticateDriver, updateDriverLocation);

// Public route (you might want to protect this too)
router.get('/location/:driverId', getDriverLocationHistory);
router.get('/reviews/summary', authenticateDriver, getMyRatingSummary);
router.get('/reviews', authenticateDriver, getMyReviews);

module.exports = router;