const express = require('express');
const router = express.Router();
const {
  sendNotification,
  getAllNotifications,
  getUserNotifications,
  markAsRead,
  deleteNotification,
  getNotificationStats
} = require('../controllers/notification.controller');
const { authenticateAdmin } = require('../middlewares/admin.auth.middleware');
const {
  authenticateDriver,
  authenticatePassenger,
} = require('../middlewares/mobile.auth.middleware');

const authenticateMobileUser = (req, res, next) => {
  const userType = req.query.userType || req.body.userType;

  if (userType === 'driver' || userType === 'Driver') {
    return authenticateDriver(req, res, next);
  }

  if (userType === 'passenger' || userType === 'Passenger') {
    return authenticatePassenger(req, res, next);
  }

  return res.status(400).json({
    success: false,
    message: 'userType is required and must be driver or passenger',
  });
};

/**
 * Admin routes
 */

// Send notification to users (admin only)
// POST /api/notifications/send
// Body: { title, message, targetAudience: 'all|drivers|passengers' }
router.post('/send', authenticateAdmin, (req, res) => {
  const io = req.app.get('io');
  sendNotification(req, res, io);
});

// Get all notifications (admin view)
// GET /api/notifications
router.get('/', authenticateAdmin, getAllNotifications);

// Get notification statistics
// GET /api/notifications/stats
router.get('/stats', authenticateAdmin, getNotificationStats);

// Delete a notification
// DELETE /api/notifications/:notificationId
router.delete('/:notificationId', authenticateAdmin, deleteNotification);

/**
 * User routes (authenticated drivers/passengers)
 */

// Get notifications for current user
// GET /api/notifications/user/my-notifications?userType=driver|passenger
router.get('/user/my-notifications', authenticateMobileUser, getUserNotifications);

// Mark notification as read
// PUT /api/notifications/:notificationId/read
// Body: { userType: 'Driver|Passenger' }
router.put('/:notificationId/read', authenticateMobileUser, markAsRead);

module.exports = router;
