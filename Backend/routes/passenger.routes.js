const express = require('express');
const router = express.Router();
const { 
    registerPassenger, 
    loginPassenger, 
    getPassengerProfile,
    updatePassengerProfile 
} = require('../controllers/passenger.controller');
const upload = require('../middlewares/upload');
const { authenticateMobileUser, isPassenger } = require('../middlewares/mobile.auth.middleware');

// Public routes
router.post('/register', registerPassenger);
router.post('/login', loginPassenger);

// Protected routes (require authentication)
router.get('/profile', authenticateMobileUser, isPassenger, getPassengerProfile);
router.put('/profile', authenticateMobileUser, isPassenger, updatePassengerProfile);

module.exports = router;
