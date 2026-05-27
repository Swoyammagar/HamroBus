const express = require('express');
const router = express.Router();
const {
  sendNotification,
  getAllNotifications,
  getUserNotifications,
  markAsRead,
  deleteNotification,
  getNotificationStats,
  registerPushToken,
  unregisterPushToken,
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

router.post('/send', authenticateAdmin, (req, res) => {
  const io = req.app.get('io');
  sendNotification(req, res, io);
});

router.get('/', authenticateAdmin, getAllNotifications);

router.get('/stats', authenticateAdmin, getNotificationStats);

/**
 * User routes (authenticated drivers/passengers)
 */

router.get('/user/my-notifications', authenticateMobileUser, getUserNotifications);

router.put('/:notificationId/read', authenticateMobileUser, markAsRead);

router.post('/push-token', authenticateMobileUser, registerPushToken);

router.delete('/push-token', authenticateMobileUser, unregisterPushToken);

router.delete('/:notificationId', authenticateAdmin, deleteNotification);

module.exports = router;
