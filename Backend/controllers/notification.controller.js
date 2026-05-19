const Notification = require('../models/notification.model');
const Driver = require('../models/driver.model');
const Passenger = require('../models/passenger.model');
const { v4: uuidv4 } = require('uuid');

/**
 * Send notification to specific audience
 * Handles: all users, drivers only, passengers only
 */
const sendNotification = async (req, res, io) => {
  try {
    const { title, message, targetAudience, type = 'info', severity = 'medium' } = req.body;
    const adminId = req.user?.id || req.user?._id;

    // Validation
    if (!title || !message || !targetAudience) {
      return res.status(400).json({
        success: false,
        message: 'Title, message, and targetAudience are required'
      });
    }

    if (!['all', 'drivers', 'passengers'].includes(targetAudience)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid targetAudience. Must be: all, drivers, or passengers'
      });
    }

    // Validate type and severity
    const validTypes = ['alert', 'info', 'maintenance', 'announcement', 'emergency'];
    const validSeverities = ['low', 'medium', 'high', 'critical'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid type. Must be: ${validTypes.join(', ')}`
      });
    }

    if (!validSeverities.includes(severity)) {
      return res.status(400).json({
        success: false,
        message: `Invalid severity. Must be: ${validSeverities.join(', ')}`
      });
    }

    // Create notification document
    const notificationId = `notif_${uuidv4()}`;
    const newNotification = new Notification({
      notificationId,
      title,
      message,
      type,
      severity,
      sentBy: 'admin',
      senderDetails: {
        senderId: adminId,
        senderName: req.user?.fullname || 'Admin'
      },
      targetAudience,
      status: 'pending'
    });

    // Save to database
    const savedNotification = await newNotification.save();

    // Emit via WebSocket to appropriate audience
    if (io) {
      const notificationPayload = {
        _id: savedNotification._id.toString(),
        id: savedNotification._id.toString(),
        notificationId: savedNotification.notificationId,
        title: savedNotification.title,
        message: savedNotification.message,
        type: savedNotification.type,
        severity: savedNotification.severity,
        sentBy: savedNotification.sentBy,
        targetAudience: savedNotification.targetAudience,
        createdAt: savedNotification.createdAt,
        senderDetails: savedNotification.senderDetails
      };

      // Emit to specific room based on target audience
      if (targetAudience === 'all') {
        io.emit('notification:new', notificationPayload);
        console.log('📢 Notification sent to ALL users');
      } else if (targetAudience === 'drivers') {
        io.to('drivers-room').emit('notification:new', notificationPayload);
        io.to('admin-room').emit('notification:new', notificationPayload);
        console.log('🚗 Notification sent to DRIVERS');
      } else if (targetAudience === 'passengers') {
        io.to('passengers-room').emit('notification:new', notificationPayload);
        io.to('admin-room').emit('notification:new', notificationPayload);
        console.log('👥 Notification sent to PASSENGERS');
      }
    }

    // Update status to sent
    savedNotification.status = 'sent';
    await savedNotification.save();

    return res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      notification: {
        _id: savedNotification._id.toString(),
        id: savedNotification._id.toString(),
        notificationId: savedNotification.notificationId,
        title: savedNotification.title,
        message: savedNotification.message,
        type: savedNotification.type,
        severity: savedNotification.severity,
        sentBy: savedNotification.sentBy,
        targetAudience: savedNotification.targetAudience,
        status: savedNotification.status,
        createdAt: savedNotification.createdAt
      }
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
};

/**
 * Get all notifications with optional filters
 */
const getAllNotifications = async (req, res) => {
  try {
    const { targetAudience, sentBy, limit = 50, skip = 0 } = req.query;

    // Build filter object
    const filter = {};
    if (targetAudience) filter.targetAudience = targetAudience;
    if (sentBy) filter.sentBy = sentBy;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean();

    const total = await Notification.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: notifications,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

/**
 * Get notifications for a specific user (driver/passenger)
 */
const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const userIdStr = String(userId); // Convert to string for consistent comparison
    const userType = req.query.userType; // 'driver' or 'passenger'

    if (!userType || !['driver', 'passenger'].includes(userType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid userType. Must be "driver" or "passenger"'
      });
    }

    // Get notifications for this specific user type
    const notifications = await Notification.find({
      $or: [
        { targetAudience: 'all' },
        { targetAudience: userType === 'driver' ? 'drivers' : 'passengers' },
        { targetUserIds: { $in: [userIdStr] } } // Use $in operator with string comparison
      ]
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching user notifications:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch user notifications',
      error: error.message
    });
  }
};

/**
 * Mark notification as read
 */
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user?.id || req.user?._id;
    const userType = req.body.userType; // 'Driver' or 'Passenger'

    if (!userType) {
      return res.status(400).json({
        success: false,
        message: 'userType is required in request body'
      });
    }

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      {
        $addToSet: {
          readBy: {
            userId,
            userType,
            readAt: new Date()
          }
        }
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

/**
 * Delete a notification
 */
const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndDelete(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

/**
 * Get notification statistics
 */
const getNotificationStats = async (req, res) => {
  try {
    const stats = await Notification.aggregate([
      {
        $group: {
          _id: '$targetAudience',
          count: { $sum: 1 },
          status: { $push: '$status' }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notification stats',
      error: error.message
    });
  }
};

module.exports = {
  sendNotification,
  getAllNotifications,
  getUserNotifications,
  markAsRead,
  deleteNotification,
  getNotificationStats
};
