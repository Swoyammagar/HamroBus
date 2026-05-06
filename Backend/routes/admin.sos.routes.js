const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middlewares/admin.auth.middleware');
const { listSos, getSosById } = require('../controllers/admin/sos.controller');

// List SOS alerts (active + history)
router.get('/', authenticateAdmin, listSos);

// Get single SOS by id
router.get('/:id', authenticateAdmin, getSosById);

module.exports = router;
