const { v4: uuidv4 } = require('uuid');
const Notification = require('../models/notification.model');
const Bus = require('../models/bus.model');
const TripSession = require('../models/tripSession.model');
const Sos = require('../models/sos.model');
const Booking = require('../models/booking.model');
const { sendPushToUsers } = require('../services/pushNotificationService');

/**
 * Create and dispatch an SOS alert from a driver.
 * Expected body: { busId, tripId, category, details, latitude, longitude }
 */
const sendSosAlert = async (req, res) => {
  try {
    const driverId = req.user && req.user.id ? String(req.user.id) : null;
    const {
      busId,
      tripId,
      category = 'other',
      details = '',
      latitude,
      longitude
    } = req.body || {};

    if (!driverId) return res.status(401).json({ message: 'Driver authentication required' });
    if (!busId) return res.status(400).json({ message: 'busId is required' });

    const notificationId = uuidv4();

    const title = `Emergency SOS: ${String(category).toUpperCase()}`;
    const message = details || `${title} reported by driver.`;
    const payload = {
      notificationId,
      title,
      message,
      sentBy: 'driver',
      driverId,
      busId,
      tripId: tripId || null,
      category,
      details,
      location: latitude && longitude ? { latitude, longitude } : null,
      timestamp: new Date().toISOString()
    };

    const notification = new Notification({
      notificationId,
      title,
      message,
      sentBy: 'driver',
      senderDetails: {
        senderId: driverId
      },
      targetAudience: 'admins',
      targetBusId: busId,
      type: 'emergency',
      severity: 'critical',
      priority: 'urgent'
    });

    await notification.save();

    try {
      const bus = await Bus.findById(busId).select('busNumber').lean();
      const driverFullName = `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || 'Unknown Driver';
      const sosDoc = new Sos({
        sosId: `sos_${uuidv4()}`,
        driverId,
        busId,
        tripId: tripId || null,
        category,
        details,
        location: latitude && longitude ? { latitude: Number(latitude), longitude: Number(longitude) } : undefined,
        status: 'active',
        senderSnapshot: {
          name: driverFullName,
          profileImgUrl: req.user?.profileImgUrl || null,
          busNumber: bus?.busNumber || null,
        },
      });
      await sosDoc.save();
      if (sosDoc && sosDoc._id) payload.sosRecordId = sosDoc._id.toString();
    } catch (err) {
      console.warn('Could not persist SOS document:', err?.message || err);
    }

    const io = req.app.get('io');

    try {
      const busUpdate = { sosActive: true, sosCategory: category, sosTimestamp: new Date() };
      if (latitude && longitude) {
        busUpdate.lastKnownLocation = {
          latitude: Number(latitude),
          longitude: Number(longitude),
          timestamp: new Date()
        };
      }
      await Bus.findByIdAndUpdate(busId, { $set: busUpdate }, { new: true });
    } catch (err) {
      console.warn('Could not update bus SOS state:', err.message || err);
    }

    if (io) {
      io.to('admin-room').emit('sos:alert', payload);

      io.to('admin-room').emit('notification:new', {
        _id: notification._id.toString(),
        notificationId: notification.notificationId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        severity: notification.severity,
        sentBy: notification.sentBy,
        targetAudience: notification.targetAudience,
        createdAt: notification.createdAt,
      });

      io.to(`bus:${busId}`).emit('driver:sos', payload);
      io.to('driver:' + driverId).emit('sos:alert', payload);
    }

    try {
      const query = {
        busId,
        status: { $in: ['confirmed', 'in-progress'] },
      };

      if (tripId) {
        query.tripSessionId = tripId;
      }

      const affectedPassengerIds = await Booking.distinct('passengerId', query);

      if (affectedPassengerIds.length > 0) {
        await sendPushToUsers({
          userType: 'passenger',
          userIds: affectedPassengerIds,
          title,
          body: message,
          data: {
            notificationId,
            type: 'sos_alert',
            busId: String(busId),
            tripId: tripId ? String(tripId) : '',
            url: '/passenger/map',
          },
          priority: 'high',
        });
      }
    } catch (pushError) {
      console.error('Passenger SOS push failed:', pushError);
    }

    return res.status(200).json({ message: 'SOS alert sent', payload });
  } catch (error) {
    console.error('Error in sendSosAlert:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

/**
 * Clear SOS status for a bus (driver presses "continue trip")
 * Expected body: { busId, tripId }
 */
const clearSos = async (req, res) => {
  try {
    const driverId = req.user && req.user.id ? String(req.user.id) : null;
    const { busId, tripId } = req.body || {};
    if (!driverId) return res.status(401).json({ message: 'Driver authentication required' });
    if (!busId) return res.status(400).json({ message: 'busId is required' });

    await Bus.findByIdAndUpdate(busId, { $set: { sosActive: false, sosCategory: null, sosTimestamp: null } });

    try {
      const filter = { busId, status: 'active' };
      if (driverId) filter.driverId = driverId;
      if (tripId) filter.tripId = tripId;
      const update = { status: 'cleared', clearedAt: new Date(), clearedBy: driverId };
      await Sos.updateMany(filter, { $set: update });
    } catch (err) {
      console.warn('Could not update SOS documents on clear:', err?.message || err);
    }

    const io = req.app.get('io');
    const payload = { driverId, busId, tripId: tripId || null, timestamp: new Date().toISOString() };

    if (io) {
      io.to('admin-room').emit('sos:cleared', payload);

      const clearedNotification = new Notification({
        notificationId: `notif_${uuidv4()}`,
        title: 'Emergency SOS Cleared',
        message: `SOS alert for bus has been cleared. The driver has resumed normal operations.`,
        sentBy: 'system',
        targetAudience: 'admins',
        status: 'sent',
        type: 'alert',
        severity: 'high'
      });
      await clearedNotification.save();

      io.to('admin-room').emit('notification:new', {
        _id: clearedNotification._id.toString(),
        notificationId: clearedNotification.notificationId,
        title: clearedNotification.title,
        message: clearedNotification.message,
        type: clearedNotification.type,
        severity: clearedNotification.severity,
        sentBy: clearedNotification.sentBy,
        targetAudience: clearedNotification.targetAudience,
        createdAt: clearedNotification.createdAt,
      });

      io.to(`bus:${busId}`).emit('driver:sos-cleared', payload);
      io.to('driver:' + driverId).emit('sos:cleared', payload);
    }

    return res.status(200).json({ message: 'SOS cleared', payload });
  } catch (error) {
    console.error('Error in clearSos:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { sendSosAlert, clearSos };
