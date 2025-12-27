const express = require('express');
const router = express.Router();
const { 
    registerDriver, 
    loginDriver, 
    updateDriverLocation, 
    getDriverLocationHistory,
    getDriverProfile 
} = require('../controllers/driver.controller');
const { authenticateMobileUser, isDriver } = require('../middlewares/mobile.auth.middleware');

// Public routes
router.post(
  '/register',
  upload.fields([
    { name: 'profileImg', maxCount: 1 },
    { name: 'licenseImg', maxCount: 1 },
  ]),
  registerDriver
);

router.post('/login', loginDriver);

// Protected routes (require authentication)
router.get('/profile', authenticateMobileUser, isDriver, getDriverProfile);
router.post('/location', authenticateMobileUser, isDriver, updateDriverLocation);
router.get('/location/:driverId', getDriverLocationHistory);

module.exports = router;
