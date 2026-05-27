const express = require('express');
const {
    submitFAQ,
    getAllFAQs,
    getFAQById,
    getUserFAQs,
    deleteFAQ
} = require('../controllers/faq.controller');
const { authenticatePassenger, authenticateDriver } = require('../middlewares/mobile.auth.middleware');
const { authenticateAdmin } = require('../middlewares/admin.auth.middleware');

const router = express.Router();

router.post('/submit', authenticatePassenger, (req, res) => {
    const io = req.app.get('io');
    submitFAQ(req, res, io);
});

router.post('/driver-submit', authenticateDriver, (req, res) => {
    const io = req.app.get('io');
    submitFAQ(req, res, io);
});


router.get('/user', authenticatePassenger, getUserFAQs);

router.get('/driver', authenticateDriver, getUserFAQs);

router.get('/admin/all', authenticateAdmin, getAllFAQs);

router.get('/admin/:faqId', authenticateAdmin, getFAQById);

router.delete('/admin/:faqId', authenticateAdmin, (req, res) => {
    const io = req.app.get('io');
    deleteFAQ(req, res, io);
});

module.exports = router;
