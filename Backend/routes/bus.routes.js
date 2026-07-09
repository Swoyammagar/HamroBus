const express = require('express');
const router = express.Router();
const { createBus, deleteBus, updateBus, getAllBuses, getBusOccupancy, getBusSosState, getBusQr } = require('../controllers/admin/bus.controller');
const { authenticateAdmin } = require('../middlewares/admin.auth.middleware');
const { authenticateDriver } = require('../middlewares/mobile.auth.middleware');
router.post('/createBus', authenticateAdmin, createBus);
router.delete('/deleteBus/:busId', authenticateAdmin, deleteBus);
router.put('/updateBus/:busId', authenticateAdmin, updateBus);
router.get('/allBuses', authenticateAdmin, getAllBuses);
router.get('/:busId/qr', authenticateDriver, getBusQr);

router.get('/:busId/occupancy', getBusOccupancy);
router.get('/:busId/sos-state', getBusSosState);

module.exports = router;
