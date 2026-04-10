const express = require('express');
const router = express.Router();
const { 
    registerPassenger, 
    loginPassenger, 
    getPassengerProfile,
    updatePassengerProfile 
} = require('../controllers/passenger.controller');
const {
    getPublicRoutes,
    getPublicRouteById,
    searchPublicRoutes,
    getPublicRouteSchedules,
    getPublicBuses,
    getPublicBusesByRoute,
    getPublicBusById,
    getPublicDriverById,
} = require('../controllers/passenger/publicData.controller');
const {
    createBooking,
    cancelBooking,
    getMyBookings,
    getSeatAvailability,
    getBookingQr,
} = require('../controllers/passenger/booking.controller');
const { authenticatePassenger } = require('../middlewares/mobile.auth.middleware');
const { initiateKhaltiPayment, verifyKhaltiPayment, khaltiReturnBridge } = require('../controllers/payment.comtroller');

// Public routes
router.post('/register', registerPassenger);
router.post('/login', loginPassenger);
router.get('/routes', getPublicRoutes);
router.get('/routes/search', searchPublicRoutes);
router.get('/routes/:routeId', getPublicRouteById);
router.get('/routes/:routeId/schedules', getPublicRouteSchedules);
router.get('/buses', getPublicBuses);
router.get('/buses/route/:routeId', getPublicBusesByRoute);
router.get('/buses/:busId', getPublicBusById);
router.get('/drivers/:driverId', getPublicDriverById);
router.get('/payments/khalti-return', khaltiReturnBridge);

// Protected routes (require authentication)
router.get('/profile', authenticatePassenger, getPassengerProfile);
router.put('/profile', authenticatePassenger, updatePassengerProfile);
router.get('/bookings', authenticatePassenger, getMyBookings);
router.post('/bookings', authenticatePassenger, createBooking);
router.post('/bookings/:bookingId/cancel', authenticatePassenger, cancelBooking);
router.get('/bookings/availability', authenticatePassenger, getSeatAvailability);
router.get('/bookings/:bookingId/qr', authenticatePassenger, getBookingQr);
router.post('/payments/initiate-khalti', authenticatePassenger, initiateKhaltiPayment);
router.post('/payments/verify-khalti', authenticatePassenger, verifyKhaltiPayment);

module.exports = router;
