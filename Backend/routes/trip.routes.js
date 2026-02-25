const express = require('express');
const router = express.Router();
const {
    getAssignedRoute,
    getDriverSchedules,
    getCurrentTrip,
    startTrip,
    endTrip,
    startBreak,
    endBreak,
    updatePassengerCount,
    getTripHistory
} = require('../controllers/trip.controller');
const { authenticateDriver } = require('../middlewares/mobile.auth.middleware');

// All routes are driver-protected
router.get('/assigned-route', authenticateDriver, getAssignedRoute);
router.get('/schedules', authenticateDriver, getDriverSchedules);
router.get('/current', authenticateDriver, getCurrentTrip);
router.post('/start', authenticateDriver, startTrip);
router.post('/end', authenticateDriver, endTrip);
router.post('/break/start', authenticateDriver, startBreak);
router.post('/break/end', authenticateDriver, endBreak);
router.post('/update-passengers', authenticateDriver, updatePassengerCount);
router.get('/history', authenticateDriver, getTripHistory);

module.exports = router;
