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
  checkLicenseNumberAvailability,
  requestDeleteProfile,
  cancelDeleteProfile,
  checkDeletionStatus
} = require('../controllers/driver.controller');
const { authenticateAdmin } = require('../middlewares/admin.auth.middleware');
const { authenticateDriver } = require('../middlewares/mobile.auth.middleware');
const { getMyRatingSummary, getMyReviews } = require('../controllers/driver/review.controller');

router.post('/register', registerDriver);
router.post('/login', loginDriver);
router.get('/check-phone-availability', checkPhoneNumberAvailability);
router.get('/check-license-availability', checkLicenseNumberAvailability);

router.get('/pending', authenticateAdmin, getPendingDrivers);
router.get('/allDrivers', authenticateAdmin, getAllDrivers);
router.post('/approve/:driverId', authenticateAdmin, approveDriver);
router.post('/reject/:driverId', authenticateAdmin, rejectDriver);

router.get('/profile', authenticateDriver, getDriverProfile);
router.put('/profile', authenticateDriver, updateDriverProfile);
router.post('/change-password', authenticateDriver, changeDriverPassword);
router.post('/location', authenticateDriver, updateDriverLocation);

router.get('/location/:driverId', getDriverLocationHistory);
router.get('/reviews/summary', authenticateDriver, getMyRatingSummary);
router.get('/reviews', authenticateDriver, getMyReviews);

router.post('/profile/request-delete', authenticateDriver, requestDeleteProfile);
router.post('/profile/cancel-delete', authenticateDriver, cancelDeleteProfile);
router.get('/profile/deletion-status', authenticateDriver, checkDeletionStatus);

module.exports = router;
