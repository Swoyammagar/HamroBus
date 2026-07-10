const express = require('express');
const router = express.Router();
const { authenticateDriver, authenticatePassenger } = require('../middlewares/mobile.auth.middleware');
const {
  getDriverBusQr,
  resolveTripFromQr,
  calculateQrFare,
  initiateQrPayment,
  verifyQrPayment,
} = require('../controllers/qrPayment.controller');

router.get('/driver/bus-qr', authenticateDriver, getDriverBusQr);
router.post('/passenger/resolve-trip', authenticatePassenger, resolveTripFromQr);
router.post('/passenger/calculate-fare', authenticatePassenger, calculateQrFare);
router.post('/passenger/initiate-khalti', authenticatePassenger, initiateQrPayment);
router.post('/passenger/verify-khalti', authenticatePassenger, verifyQrPayment);

module.exports = router;
