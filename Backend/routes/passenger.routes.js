const express = require('express');
const router = express.Router();
const { 
    registerPassenger, 
    loginPassenger, 
    getPassengerProfile,
    updatePassengerProfile 
} = require('../controllers/passenger.controller');
const { authenticatePassenger } = require('../middlewares/mobile.auth.middleware');

// Public routes
router.post('/register', registerPassenger);
router.post('/login', loginPassenger);

// Protected routes (require authentication)
router.get('/profile', authenticatePassenger, getPassengerProfile);
router.put('/profile', authenticatePassenger, updatePassengerProfile);

module.exports = router;
