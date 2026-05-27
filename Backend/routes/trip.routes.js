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
    scanBookingQr,
    getAllTripsWithBookings,
    getTripDetailsById
} = require('../controllers/trip.controller');
const { authenticateDriver } = require('../middlewares/mobile.auth.middleware');
const { authenticateAdmin } = require('../middlewares/admin.auth.middleware');

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

router.post('/system/process-missed-trips', authenticateAdmin, processMissedTrips);

router.get('/admin/all-trips', authenticateAdmin, getAllTripsWithBookings);
router.get('/admin/:tripId', authenticateAdmin, getTripDetailsById);

module.exports = router;
