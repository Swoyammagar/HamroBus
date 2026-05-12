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

// Public route - Submit FAQ
router.post('/submit', (req, res) => {
    const io = req.app.get('io');
    submitFAQ(req, res, io);
});

// User route - Get user's own FAQs (passenger)
router.get('/user', authenticatePassenger, getUserFAQs);

// Driver route - Get driver's own FAQs
router.get('/driver', authenticateDriver, getUserFAQs);

// Admin routes
// Get all FAQs (with role filter and pagination)
router.get('/admin/all', authenticateAdmin, getAllFAQs);

// Get single FAQ by ID
router.get('/admin/:faqId', authenticateAdmin, getFAQById);

// Delete FAQ
router.delete('/admin/:faqId', authenticateAdmin, (req, res) => {
    const io = req.app.get('io');
    deleteFAQ(req, res, io);
});

module.exports = router;
