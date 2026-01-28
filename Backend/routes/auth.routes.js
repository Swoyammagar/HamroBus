const express = require('express');
const router = express.Router();
const { refreshAccessToken, refreshAccessTokenMobile, logoutMobile, logout } = require('../controllers/auth.controller');

router.post('/refresh', refreshAccessToken);
router.post('/refresh-mobile', refreshAccessTokenMobile);
router.post('/logout', logout);
router.post('/logout-mobile', logoutMobile); 

module.exports = router;