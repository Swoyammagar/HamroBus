const { v4: uuidv4 } = require('uuid');
const Notification = require('../models/notification.model');
const Bus = require('../models/bus.model');
const TripSession = require('../models/tripSession.model');
const Sos = require('../models/sos.model');

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

    // Build notification doc
    const title = `Emergency SOS: ${String(category).toUpperCase()}`;
    const message = details || `${title} reported by driver.`;

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

    // Persist SOS document for admin history
    try {
      const bus = await Bus.findById(busId).select('busNumber').lean();
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
          name: req.user?.fullname || null,
          profileImgUrl: req.user?.profileImgUrl || null,
          busNumber: bus?.busNumber || null,
        },
      });
      await sosDoc.save();
      // include DB id in payload
      if (sosDoc && sosDoc._id) payload.sosRecordId = sosDoc._id.toString();
    } catch (err) {
      console.warn('Could not persist SOS document:', err?.message || err);
    }

    const io = req.app.get('io');

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

    // Update Bus state: last known location + sosActive
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

    // Emit immediate event to admin room so admin panel can play SOS sound and show marker
    if (io) {
      io.to('admin-room').emit('sos:alert', payload);
      // Also inform all passengers viewing the bus so their maps show red marker
      io.to(`bus:${busId}`).emit('driver:sos', payload);
      // Inform the driver that SOS was registered immediately
      io.to('driver:' + driverId).emit('sos:alert', payload);
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

    // Mark SOS documents as cleared (latest active for this bus/driver/trip)
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
      io.to(`bus:${busId}`).emit('driver:sos-cleared', payload);
      // Inform the driver that SOS was cleared
      io.to('driver:' + driverId).emit('sos:cleared', payload);
    }

    return res.status(200).json({ message: 'SOS cleared', payload });
  } catch (error) {
    console.error('Error in clearSos:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { sendSosAlert, clearSos };
