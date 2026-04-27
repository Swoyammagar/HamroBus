const Booking = require('../models/booking.model');
const Route = require('../models/route.model');
const Driver = require('../models/driver.model');
const TripSession = require('../models/tripSession.model');
const Notification = require('../models/notification.model');
const { sendEmail } = require('../utils/sendEmail');
const { v4: uuidv4 } = require('uuid');
const { missed_trip_apology_boilerplate } = require('../utils/boilerplate.data');

const normalizeDateOnly = (value) => {
  const input = value ? new Date(value) : new Date();
  if (Number.isNaN(input.getTime())) {
    return null;
  }
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
};

const notifyMissedTrip = async ({ io, route, schedule, busId, changedBookings }) => {
  if (!Array.isArray(changedBookings) || !changedBookings.length) return;

  const routeLabel = String(route?.routeName || route?.routeNumber || route?._id || 'Route');
  const driverId = schedule?.driverId ? String(schedule.driverId) : '';
  let driverLabel = 'Driver';

  if (driverId) {
    const driver = await Driver.findById(driverId).select('firstName lastName').lean();
    if (driver) {
      driverLabel = [driver.firstName, driver.lastName].filter(Boolean).join(' ').trim() || `Driver ${driverId.slice(-6)}`;
    } else {
      driverLabel = `Driver ${driverId.slice(-6)}`;
    }
  }

  const adminTitle = 'Missed trip detected';
  const adminMessage = `Route ${routeLabel} by ${driverLabel} scheduled ${schedule.startTime}-${schedule.endTime} was missed. ${changedBookings.length} booking(s) were auto-cancelled.`;

  const adminDoc = await Notification.create({
    notificationId: `notif_${uuidv4()}`,
    title: adminTitle,
    message: adminMessage,
    sentBy: 'system',
    targetAudience: 'admins',
    status: 'sent',
    type: 'alert',
    severity: 'high',
  });

  if (io) {
    io.to('admin-room').emit('notification:new', {
      _id: String(adminDoc._id),
      notificationId: adminDoc.notificationId,
      title: adminDoc.title,
      message: adminDoc.message,
      type: adminDoc.type,
      severity: adminDoc.severity,
      sentBy: adminDoc.sentBy,
      targetAudience: adminDoc.targetAudience,
      createdAt: adminDoc.createdAt,
    });
  }

  if (driverId) {
    const driverTitle = 'Trip marked as missed';
    const driverMessage = `Your scheduled trip for route ${routeLabel} (${schedule.startTime}-${schedule.endTime}) by ${driverLabel} was marked as missed. ${changedBookings.length} booking(s) were auto-cancelled.`;

    const driverDoc = await Notification.create({
      notificationId: `notif_${uuidv4()}`,
      title: driverTitle,
      message: driverMessage,
      sentBy: 'system',
      targetAudience: 'specific_user',
      targetUserIds: [driverId],
      status: 'sent',
      type: 'alert',
      severity: 'high',
    });

    if (io) {
      io.to('driver:' + driverId).emit('notification:new', {
        _id: String(driverDoc._id),
        notificationId: driverDoc.notificationId,
        title: driverDoc.title,
        message: driverDoc.message,
        type: driverDoc.type,
        severity: driverDoc.severity,
        sentBy: driverDoc.sentBy,
        targetAudience: driverDoc.targetAudience,
        createdAt: driverDoc.createdAt,
      });
    }
  }

  for (const row of changedBookings) {
    const passengerId = row.passengerId ? String(row.passengerId) : '';
    const passengerTitle = 'Trip cancelled - we are sorry';
    const passengerMessage = `Your booking ${row.bookingCode} was cancelled because the trip did not start in time. We sincerely apologize for the inconvenience.`;

    let passengerDoc = null;
    if (passengerId) {
      passengerDoc = await Notification.create({
        notificationId: `notif_${uuidv4()}`,
        title: passengerTitle,
        message: passengerMessage,
        sentBy: 'system',
        targetAudience: 'passengers',
        targetUserIds: [passengerId],
        status: 'sent',
        type: 'alert',
        severity: 'high',
      });
    }

    if (io && passengerDoc && passengerId) {
      io.to('passenger:' + passengerId).emit('notification:new', {
        _id: String(passengerDoc._id),
        notificationId: passengerDoc.notificationId,
        title: passengerDoc.title,
        message: passengerDoc.message,
        type: passengerDoc.type,
        severity: passengerDoc.severity,
        sentBy: passengerDoc.sentBy,
        targetAudience: passengerDoc.targetAudience,
        createdAt: passengerDoc.createdAt,
      });

      io.to('passenger:' + passengerId).emit('booking:status-updated', {
        bookingCode: row.bookingCode,
        status: 'cancelled',
        reason: 'Trip missed by driver',
        timestamp: new Date().toISOString(),
      });
    }

    if (row.passengerEmail) {
      const html = missed_trip_apology_boilerplate({
        passengerName: row.passengerName,
        bookingCode: row.bookingCode,
        routeName: routeLabel,
        scheduleStart: schedule.startTime,
        scheduleEnd: schedule.endTime,
      });

      await sendEmail(row.passengerEmail, html, 'Trip cancelled - apology from HamroBus');
    }
  }
};

const syncBookingsOnTripStart = async ({ trip }) => {
  if (!trip || !trip.routeId || !trip.busId || !trip.scheduleId) {
    return { matched: 0, modified: 0, changedBookings: [] };
  }

  const serviceDate = normalizeDateOnly(trip.startTime || new Date());
  if (!serviceDate) {
    return { matched: 0, modified: 0, changedBookings: [] };
  }

  const filter = {
    routeId: trip.routeId,
    busId: trip.busId,
    scheduleId: trip.scheduleId,
    serviceDate,
    status: 'confirmed',
  };

  const transitionTime = new Date();

  const candidates = await Booking.find(filter)
    .select('_id bookingCode passengerId')
    .lean();

  if (!candidates.length) {
    return { matched: 0, modified: 0, changedBookings: [] };
  }

  const result = await Booking.updateMany(
    filter,
    {
      $set: {
        status: 'in-progress',
        tripSessionId: trip._id,
        startedAt: transitionTime,
      },
    }
  );

  const changedBookings = candidates.map((row) => ({
    bookingId: String(row._id),
    bookingCode: row.bookingCode,
    passengerId: String(row.passengerId),
    status: 'in-progress',
    startedAt: transitionTime,
  }));

  return {
    matched: result.matchedCount || 0,
    modified: result.modifiedCount || 0,
    changedBookings,
  };
};

const completeBookingsByReachedStop = async ({ trip, reachedStopName }) => {
  if (!trip || !trip.routeId || !trip.busId || !trip.scheduleId || !reachedStopName) {
    return { matched: 0, modified: 0 };
  }

  const route = await Route.findById(trip.routeId).select('stops');
  if (!route) {
    return { matched: 0, modified: 0 };
  }

  const normalizedReached = String(reachedStopName).trim().toLowerCase();
  const reachedStop = route.stops.find(
    (stop) => String(stop.stopName || '').trim().toLowerCase() === normalizedReached
  );

  if (!reachedStop) {
    return { matched: 0, modified: 0 };
  }

  const reachedSequence = Number(reachedStop.sequence || 0);
  if (!reachedSequence) {
    return { matched: 0, modified: 0 };
  }

  const result = await Booking.updateMany(
    {
      routeId: trip.routeId,
      busId: trip.busId,
      scheduleId: trip.scheduleId,
      tripSessionId: trip._id,
      status: 'in-progress',
      'destinationStop.sequence': { $lte: reachedSequence },
    },
    {
      $set: {
        status: 'completed',
        completedAt: new Date(),
      },
    }
  );

  return {
    matched: result.matchedCount || 0,
    modified: result.modifiedCount || 0,
  };
};

const completeAllInProgressBookingsForTrip = async ({ trip }) => {
  if (!trip || !trip._id || !trip.routeId || !trip.busId || !trip.scheduleId) {
    return { matched: 0, modified: 0, changedBookings: [] };
  }

  const tripDate = normalizeDateOnly(trip.startTime || trip.endTime || new Date());
  if (!tripDate) {
    return { matched: 0, modified: 0, changedBookings: [] };
  }

  const filter = {
    routeId: trip.routeId,
    busId: trip.busId,
    scheduleId: trip.scheduleId,
    serviceDate: tripDate,
    status: { $in: ['in-progress', 'on-break'] },
    $or: [
      { tripSessionId: trip._id },
      { tripSessionId: { $exists: false } },
      { tripSessionId: null },
    ],
  };

  const transitionTime = new Date();

  const candidates = await Booking.find(filter)
    .select('_id bookingCode passengerId')
    .lean();

  if (!candidates.length) {
    return { matched: 0, modified: 0, changedBookings: [] };
  }

  const result = await Booking.updateMany(
    filter,
    {
      $set: {
        status: 'completed',
        completedAt: transitionTime,
        tripSessionId: trip._id,
      },
    }
  );

  const changedBookings = candidates.map((row) => ({
    bookingId: String(row._id),
    bookingCode: row.bookingCode,
    passengerId: String(row.passengerId),
    status: 'completed',
    completedAt: transitionTime,
  }));

  return {
    matched: result.matchedCount || 0,
    modified: result.modifiedCount || 0,
    changedBookings,
  };
};

/**
 * Helper function to convert HH:MM format to minutes since midnight
 */
const timeStringToMinutes = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

/**
 * Get current time in minutes since midnight (UTC)
 */
const getCurrentTimeInMinutes = () => {
  const now = new Date();
  return now.getUTCHours() * 60 + now.getUTCMinutes();
};

/**
 * Check if current time is past a given schedule end time
 */
const isPastScheduleEndTime = (endTimeStr) => {
  const scheduleEndMinutes = timeStringToMinutes(endTimeStr);
  const currentMinutes = getCurrentTimeInMinutes();
  
  if (scheduleEndMinutes === null) return false;
  return currentMinutes > scheduleEndMinutes;
};

/**
 * Cancel bookings for a trip that has not been started by its scheduled end time
 * This processes confirmed bookings that missed their trip departure
 */
const cancelMissedTripBookings = async ({ routeId, busId, scheduleId, serviceDate, endTime }) => {
  if (!routeId || !busId || !scheduleId || !serviceDate || !endTime) {
    return { matched: 0, modified: 0, reason: 'Missing required parameters', changedBookings: [] };
  }

  // Normalize the service date
  const normalizedServiceDate = normalizeDateOnly(serviceDate);
  if (!normalizedServiceDate) {
    return { matched: 0, modified: 0, reason: 'Invalid service date', changedBookings: [] };
  }

  // Check if the schedule's end time has passed
  if (!isPastScheduleEndTime(endTime)) {
    return { matched: 0, modified: 0, reason: 'Schedule end time not yet reached', changedBookings: [] };
  }

  // Check if trip was already started (even if later)
  const tripSessionExists = await TripSession.findOne({
    routeId,
    busId,
    scheduleId,
    startTime: {
      $gte: normalizedServiceDate,
      $lt: new Date(normalizedServiceDate.getTime() + 24 * 60 * 60 * 1000),
    },
  });

  if (tripSessionExists) {
    return { matched: 0, modified: 0, reason: 'Trip already started', changedBookings: [] };
  }

  const filter = {
    routeId,
    busId,
    scheduleId,
    serviceDate: normalizedServiceDate,
    status: 'confirmed',
  };

  const candidates = await Booking.find(filter)
    .populate('passengerId', 'firstName lastName email')
    .select('bookingCode passengerId destinationStop boardingStop seatNumbers serviceDate')
    .lean();

  if (!candidates.length) {
    return { matched: 0, modified: 0, reason: 'No confirmed bookings', changedBookings: [] };
  }

  const cancelledAt = new Date(); 

  // Cancel confirmed bookings for this trip
  const result = await Booking.updateMany(
    filter,
    {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: 'Trip was not started by the scheduled departure time',
      }
    }
  );

  const changedBookings = candidates.map((b) => ({
    bookingCode: b.bookingCode,
    passengerId: String(b.passengerId?._id || ''),
    passengerEmail: b.passengerId?.email || '',
    passengerName: [b.passengerId?.firstName, b.passengerId?.lastName].filter(Boolean).join(' ').trim() || 'Passenger',
    destinationStop: b.destinationStop?.stopName || '',
    boardingStop: b.boardingStop?.stopName || '',
    seatNumbers: b.seatNumbers || [],
  }));

  return {
    matched: result.matchedCount || 0,
    modified: result.modifiedCount || 0,
    reason: 'Bookings cancelled due to missed trip departure',
    changedBookings,
  };
};

const combineDateAndTimeUtc = (dateOnly, hhmm) => {
  if (!dateOnly || !hhmm) return null;
  const [h, m] = String(hhmm).split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const dt = new Date(dateOnly);
  dt.setUTCHours(h, m, 0, 0);
  return dt;
};

const ensureMissedTripSession = async ({ routeId, busId, schedule }) => {
  const serviceDate = normalizeDateOnly(new Date());
  const dayEnd = new Date(serviceDate.getTime() + 24 * 60 * 60 * 1000);

  const existing = await TripSession.findOne({
    routeId,
    busId,
    scheduleId: schedule._id,
    startTime: { $gte: serviceDate, $lt: dayEnd },
  });

  if (existing) return existing;

  const missedTrip = await TripSession.create({
    driverId: schedule.driverId,
    routeId,
    busId,
    scheduleId: schedule._id,
    status: 'missed',
    startTime: combineDateAndTimeUtc(serviceDate, schedule.startTime),
    endTime: combineDateAndTimeUtc(serviceDate, schedule.endTime),
    notes: 'Auto-marked as missed: trip not started before schedule end time',
  });

  return missedTrip;
};

/**
 * Process all missed trips for today
 * Call this periodically (e.g., every hour) or after schedule end time
 */
const processMissedTripsForToday = async ({io}) => {
  try {
    const today = normalizeDateOnly(new Date());
    if (!today) {
      return { processed: 0, totalCancelled: 0, errors: [] };
    }

    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });

    // Find all schedules for today that haven't had a trip started
    const schedules = await Route.find({}, 'routeName routeNumber schedules').lean();
    
    let totalProcessed = 0;
    let totalCancelled = 0;
    const errors = [];

    for (const route of schedules) {
      if (!route.schedules) continue;

      for (const schedule of route.schedules) {
        try {
          if (schedule.dayOfWeek !== dayName) continue;

          // Only process if end time has passed
          if (!isPastScheduleEndTime(schedule.endTime)) continue;

          const result = await cancelMissedTripBookings({
            routeId: route._id,
            busId: schedule.busId,
            scheduleId: schedule._id,
            serviceDate: today,
            endTime: schedule.endTime,
          });

          if (result.modified > 0) {
            await ensureMissedTripSession({
              routeId: route._id,
              busId: schedule.busId,
              schedule,
            });

            await notifyMissedTrip({
              io,
              route,
              schedule,
              busId: schedule.busId,
              changedBookings: result.changedBookings || [],
            });
          }

          if (result.modified > 0) {
            totalProcessed++;
            totalCancelled += result.modified;
            console.log(
              `📋 Missed trip processed - Route: ${route._id}, Schedule: ${schedule._id}, Cancelled: ${result.modified}`
            );
          }
        } catch (error) {
          errors.push({
            scheduleId: schedule._id,
            error: error.message,
          });
          console.error(`Error processing missed trip for schedule ${schedule._id}:`, error);
        }
      }
    }

    return {
      processed: totalProcessed,
      totalCancelled,
      errors,
    };
  } catch (error) {
    console.error('Error in processMissedTripsForToday:', error);
    return { processed: 0, totalCancelled: 0, errors: [error.message] };
  }
};

module.exports = {
  syncBookingsOnTripStart,
  completeBookingsByReachedStop,
  completeAllInProgressBookingsForTrip,
  cancelMissedTripBookings,
  processMissedTripsForToday,
};
