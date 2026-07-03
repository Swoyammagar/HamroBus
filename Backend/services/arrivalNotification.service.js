const Booking = require('../models/booking.model');
const Notification = require('../models/notification.model');
const { v4: uuidv4 } = require('uuid');
const { sendPushToUsers } = require('./pushNotificationService');
const { calculateEtaToStop } = require('./arrivalEta.service');
const { getCurrentStopSequence } = require('./distanceUtils');

const ARRIVAL_NOTIFICATION_THRESHOLD_MINUTES = Number(
  process.env.ARRIVAL_NOTIFICATION_THRESHOLD_MINUTES || 5
);
const BOOKING_CACHE_TTL_MS = Number(process.env.ARRIVAL_BOOKING_CACHE_TTL_MS || 30000);
const ETA_RECALCULATION_INTERVAL_MS = Number(process.env.ARRIVAL_ETA_RECALCULATION_INTERVAL_MS || 15000);

const activeBookingCacheByTrip = new Map();
const lastProcessedByTrip = new Map();

const toObjectIdValue = (value) => value?._id || value;

const getActiveBookingsForTrip = async (tripId) => {
  const key = String(tripId);
  const cached = activeBookingCacheByTrip.get(key);
  const now = Date.now();

  if (cached && now - cached.loadedAt < BOOKING_CACHE_TTL_MS) {
    return cached.bookings;
  }

  const bookings = await Booking.find({
    tripSessionId: tripId,
    status: { $in: ['confirmed', 'in-progress'] },
    isBoarded: false,
    $or: [
      { arrivalReminderSentAt: { $exists: false } },
      { arrivalReminderSentAt: null },
    ],
  })
    .select('bookingCode passengerId boardingStop arrivalReminderSentAt')
    .lean();

  activeBookingCacheByTrip.set(key, {
    loadedAt: now,
    bookings,
  });

  return bookings;
};

const removeBookingFromCache = (tripId, bookingId) => {
  const cached = activeBookingCacheByTrip.get(String(tripId));
  if (!cached) return;

  cached.bookings = cached.bookings.filter((booking) => String(booking._id) !== String(bookingId));
  cached.loadedAt = Date.now();
};

const shouldProcessTrip = (tripId) => {
  const key = String(tripId);
  const now = Date.now();
  const lastProcessedAt = lastProcessedByTrip.get(key) || 0;

  if (now - lastProcessedAt < ETA_RECALCULATION_INTERVAL_MS) {
    return false;
  }

  lastProcessedByTrip.set(key, now);
  return true;
};

const createArrivalNotification = async ({ io, trip, booking, eta }) => {
  const passengerId = String(toObjectIdValue(booking.passengerId) || '');
  if (!passengerId) return null;

  const updateResult = await Booking.updateOne(
    {
      _id: booking._id,
      status: { $in: ['confirmed', 'in-progress'] },
      isBoarded: false,
      $or: [
        { arrivalReminderSentAt: { $exists: false } },
        { arrivalReminderSentAt: null },
      ],
    },
    {
      $set: {
        arrivalReminderSentAt: new Date(),
      },
    }
  );

  if (updateResult.modifiedCount !== 1) {
    return null;
  }

  const title = 'Vehicle Arriving Soon';
  const message = 'Your booked vehicle is expected to arrive at your boarding stop in approximately 5 minutes. Please proceed to your boarding location.';

  const doc = await Notification.create({
    notificationId: `notif_${uuidv4()}`,
    title,
    message,
    sentBy: 'system',
    targetAudience: 'specific_user',
    targetUserIds: [passengerId],
    status: 'sent',
    type: 'info',
    severity: 'medium',
    metadata: {
      bookingId: String(booking._id),
      bookingCode: booking.bookingCode,
      tripId: String(trip._id),
      routeId: String(trip.routeId),
      busId: trip.busId ? String(trip.busId) : '',
      boardingStop: booking.boardingStop,
      etaMinutes: Number(eta.etaMinutes.toFixed(2)),
      remainingDistanceMeters: Math.round(eta.remainingDistanceMeters),
      averageSpeedMps: Number(eta.averageSpeedMps.toFixed(2)),
      closestStop: eta.closestStop?.stopName || null,
      closestStopSequence: eta.closestStopSequence,
      thresholdMinutes: ARRIVAL_NOTIFICATION_THRESHOLD_MINUTES,
    },
  });

  const payload = {
    _id: String(doc._id),
    id: String(doc._id),
    notificationId: doc.notificationId,
    title,
    message,
    type: doc.type,
    severity: doc.severity,
    sentBy: doc.sentBy,
    targetAudience: doc.targetAudience,
    bookingId: String(booking._id),
    bookingCode: booking.bookingCode,
    tripId: String(trip._id),
    etaMinutes: Number(eta.etaMinutes.toFixed(2)),
    createdAt: doc.createdAt,
  };

  if (io) {
    io.to(`passenger:${passengerId}`).emit('notification:new', payload);
  }

  sendPushToUsers({
    userType: 'passenger',
    userIds: [passengerId],
    title,
    body: message,
    data: {
      notificationId: doc.notificationId,
      bookingId: String(booking._id),
      bookingCode: booking.bookingCode,
      tripId: String(trip._id),
      type: 'vehicle_arriving_soon',
      url: '/passenger/notifications',
    },
    priority: 'high',
  }).catch((pushError) => {
    console.error('Passenger vehicle arriving soon push failed:', pushError);
  });

  removeBookingFromCache(trip._id, booking._id);

  return doc;
};

const notifyPassengersForUpcomingBoardingStops = async ({ io, trip, route, latitude, longitude }) => {
  if (!trip || trip.status !== 'in-progress' || !route?.stops?.length) {
    return { sent: 0, skipped: true };
  }

  if (!shouldProcessTrip(trip._id)) {
    return { sent: 0, skipped: true, reason: 'THROTTLED' };
  }

  const bookings = await getActiveBookingsForTrip(trip._id);
  if (!bookings.length) {
    return { sent: 0 };
  }

  const etaByStopSequence = new Map();
  const currentStopSequence = getCurrentStopSequence(trip.currentStop, route);
  let sent = 0;

  for (const booking of bookings) {
    const boardingStopSequence = Number(booking.boardingStop?.sequence);
    if (!Number.isFinite(boardingStopSequence)) continue;
    if (currentStopSequence >= boardingStopSequence) continue;

    const etaKey = String(boardingStopSequence);
    let eta = etaByStopSequence.get(etaKey);
    if (!eta) {
      eta = calculateEtaToStop({
        tripId: trip._id,
        latitude,
        longitude,
        route,
        boardingStopSequence,
      });
      etaByStopSequence.set(etaKey, eta);
    }

    if (!eta.canCalculate || eta.etaMinutes > ARRIVAL_NOTIFICATION_THRESHOLD_MINUTES) {
      continue;
    }

    const doc = await createArrivalNotification({ io, trip, booking, eta });
    if (doc) sent += 1;
  }

  return { sent };
};

const clearArrivalNotificationTripCache = (tripId) => {
  if (!tripId) return;
  activeBookingCacheByTrip.delete(String(tripId));
  lastProcessedByTrip.delete(String(tripId));
};

module.exports = {
  ARRIVAL_NOTIFICATION_THRESHOLD_MINUTES,
  notifyPassengersForUpcomingBoardingStops,
  clearArrivalNotificationTripCache,
};
