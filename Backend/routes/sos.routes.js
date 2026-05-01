const express = require('express');
const router = express.Router();
const { authenticateDriver } = require('../middlewares/mobile.auth.middleware');
const { sendSosAlert, clearSos } = require('../controllers/sos.controller');

// Driver sends SOS
router.post('/send', authenticateDriver, sendSosAlert);

// Driver clears SOS / continues trip
router.post('/clear', authenticateDriver, clearSos);

module.exports = router;
