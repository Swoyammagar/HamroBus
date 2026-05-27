const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../middlewares/admin.auth.middleware');
const { listSos, getSosById } = require('../controllers/admin/sos.controller');

router.get('/', authenticateAdmin, listSos);

router.get('/:id', authenticateAdmin, getSosById);

module.exports = router;
