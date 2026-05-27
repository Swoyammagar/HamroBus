const express = require('express');
const router = express.Router();
const { authenticateDriver } = require('../middlewares/mobile.auth.middleware');
const { sendSosAlert, clearSos } = require('../controllers/sos.controller');

router.post('/send', authenticateDriver, sendSosAlert);

router.post('/clear', authenticateDriver, clearSos);

module.exports = router;
