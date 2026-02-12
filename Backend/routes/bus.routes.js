const express = require('express');
const router = express.Router();
const { createBus, deleteBus, updateBus, getAllBuses } = require('../controllers/admin/bus.controller');
const { authenticateAdmin } = require('../middlewares/admin.auth.middleware');
// Admin-only routes
router.post('/createBus', authenticateAdmin, createBus);
router.delete('/deleteBus/:busId', authenticateAdmin, deleteBus);
router.put('/updateBus/:busId', authenticateAdmin, updateBus);
router.get('/allBuses', authenticateAdmin, getAllBuses);
module.exports = router;