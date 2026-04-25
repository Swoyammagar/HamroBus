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
    getTripHistory,
    getTodayCompletedTrips,
    getScheduleSeatMap,
    processMissedTrips,
    scanBookingQr
} = require('../controllers/trip.controller');
const { authenticateDriver } = require('../middlewares/mobile.auth.middleware');
const { authenticateAdmin } = require('../middlewares/admin.auth.middleware');

// All routes are driver-protected
router.get('/assigned-route', authenticateDriver, getAssignedRoute);
router.get('/schedules', authenticateDriver, getDriverSchedules);
router.get('/current', authenticateDriver, getCurrentTrip);
router.get('/today-completed', authenticateDriver, getTodayCompletedTrips);
router.get('/schedule-seat-map', authenticateDriver, getScheduleSeatMap);
router.post('/start', authenticateDriver, startTrip);
router.post('/end', authenticateDriver, endTrip);
router.post('/break/start', authenticateDriver, startBreak);
router.post('/break/end', authenticateDriver, endBreak);
router.post('/update-passengers', authenticateDriver, updatePassengerCount);
router.get('/history', authenticateDriver, getTripHistory);
router.post('/scan-booking-qr', authenticateDriver, scanBookingQr);

// System endpoint for processing missed trips (can be called by cron job or admin)
router.post('/system/process-missed-trips', authenticateAdmin, processMissedTrips);

module.exports = router;
