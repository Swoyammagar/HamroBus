const Booking = require('../models/booking.model');
const Route = require('../models/route.model');
const Driver = require('../models/driver.model');
const Passenger = require('../models/passenger.model');
const TripSession = require('../models/tripSession.model');
const Bus = require('../models/bus.model');
const Notification = require('../models/notification.model');
const { sendEmail } = require('../utils/sendEmail');
const { awardPoints } = require('./rewardService');
const { getIoInstance } = require('./ioManager');
const { v4: uuidv4 } = require('uuid');
const { missed_trip_apology_boilerplate } = require('../utils/boilerplate.data');

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kathmandu';

const normalizeDateOnly = (value) => {
  const input = value ? new Date(value) : new Date();
  if (Number.isNaN(input.getTime())) {
    return null;
  }
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
};

const notifyMissedTrip = async ({ io, route, schedule, busId, changedBookings }) => {
  const bookings = Array.isArray(changedBookings) ? changedBookings : [];

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
  const adminMessage = `Route ${routeLabel} by ${driverLabel} scheduled ${schedule.startTime}-${schedule.endTime} was missed. ${bookings.length} booking(s) were auto-cancelled.`;

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
    const driverMessage = `Your scheduled trip for route ${routeLabel} (${schedule.startTime}-${schedule.endTime}) by ${driverLabel} was marked as missed. ${bookings.length} booking(s) were auto-cancelled.`;

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

  for (const row of bookings) {
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

const completeBookingsByReachedStop = async ({ trip, reachedStopName, io } = {}) => {
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

  // Find bookings that should be completed at this reached stop
  const bookingsToComplete = await Booking.find({
    routeId: trip.routeId,
    busId: trip.busId,
    scheduleId: trip.scheduleId,
    tripSessionId: trip._id,
    status: 'in-progress',
    'destinationStop.sequence': { $lte: reachedSequence },
  }).select('_id seatCount passengerId bookingCode').lean();

  if (!bookingsToComplete.length) {
    return { matched: 0, modified: 0 };
  }

  const seatsFreed = bookingsToComplete.reduce((sum, b) => sum + (Number(b.seatCount || 0)), 0);

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

  // Decrement trip passenger count and persist Bus occupancy
  try {
    const tripDoc = await TripSession.findById(trip._id);
    if (tripDoc) {
      const previousOccupancy = Number(tripDoc.passengerCount || 0);
      tripDoc.passengerCount = Math.max(0, previousOccupancy - seatsFreed);
      
      // ========== NEW: Add to occupancy history ==========
      if (!tripDoc.occupancyHistory) {
        tripDoc.occupancyHistory = [];
      }
      tripDoc.occupancyHistory.push({
        timestamp: new Date(),
        stopName: reachedStopName,
        stopSequence: reachedSequence,
        passengersBoarded: 0,
        passengersAlighted: seatsFreed,
        currentOccupancy: tripDoc.passengerCount,
        eventType: 'alighting'
      });
      // ========== END NEW ==========
      
      await tripDoc.save();
      console.log(`📍 Occupancy history logged at ${reachedStopName}: ${seatsFreed} alighted, current occupancy: ${tripDoc.passengerCount}`);
    }

    if (trip.busId) {
      const busDoc = await Bus.findById(trip.busId).select('currentPassengers');
      if (busDoc) {
        busDoc.currentPassengers = Math.max(0, Number(busDoc.currentPassengers || 0) - seatsFreed);
        await busDoc.save();

        // Emit occupancy update to passengers viewing this bus
        if (io) {
          io.to(`bus:${String(trip.busId)}`).emit('trip:occupancy-updated', {
            tripId: String(trip._id),
            busId: String(trip.busId),
            passengerCount: busDoc.currentPassengers,
            timestamp: new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.error('Error updating counts after completing bookings:', err);
  }

  // Notify individual passengers about completion
  if (io) {
    for (const b of bookingsToComplete) {
      const payload = {
        bookingId: String(b._id),
        bookingCode: b.bookingCode,
        status: 'completed',
        tripId: String(trip._id),
        routeId: String(trip.routeId),
        busId: String(trip.busId),
        scheduleId: String(trip.scheduleId),
        completedAt: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };

      if (b.passengerId) {
        io.to(`passenger:${String(b.passengerId)}`).emit('booking:status-updated', payload);
        io.to(`passenger:${String(b.passengerId)}`).emit('booking:completed', payload);

        // ========== NEW: Award reward points ==========
        try {
          const rewardResult = await awardPoints(String(b.passengerId), String(b._id));
          if (rewardResult.success) {
            console.log(`🎁 Rewards awarded to passenger ${b.passengerId}: ${rewardResult.message}`);
          }
        } catch (err) {
          console.error(`Failed to award points to passenger ${b.passengerId}:`, err);
        }
        // ========== END NEW ==========
      }
    }
  }

  return {
    matched: result.matchedCount || bookingsToComplete.length,
    modified: result.modifiedCount || bookingsToComplete.length,
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

  // ========== NEW: Award reward points to each passenger ==========
  for (const booking of changedBookings) {
    if (booking.passengerId) {
      try {
        const rewardResult = await awardPoints(String(booking.passengerId), String(booking.bookingId));
        if (rewardResult.success) {
          console.log(`🎁 Rewards awarded to passenger ${booking.passengerId} on trip end: ${rewardResult.message}`);
        }
      } catch (err) {
        console.error(`Failed to award points to passenger ${booking.passengerId} on trip end:`, err);
      }
    }
  }
  // ========== END NEW ==========

  // ========== NEW: Decrease occupancy when trip ends ==========
  const passengersCompleted = result.modifiedCount || 0;
  if (passengersCompleted > 0) {
    try {
      const io = getIoInstance();

      // Update trip session passenger count
      const tripDoc = await TripSession.findById(trip._id);
      if (tripDoc) {
        const previousOccupancy = Number(tripDoc.passengerCount || 0);
        tripDoc.passengerCount = Math.max(0, previousOccupancy - passengersCompleted);

        if (!tripDoc.occupancyHistory) {
          tripDoc.occupancyHistory = [];
        }
        tripDoc.occupancyHistory.push({
          timestamp: new Date(),
          stopName: 'Trip End',
          stopSequence: -1,
          passengersBoarded: 0,
          passengersAlighted: passengersCompleted,
          currentOccupancy: tripDoc.passengerCount,
          eventType: 'trip-ended'
        });

        await tripDoc.save();
        console.log(`🏁 Trip ended - Occupancy decreased: ${passengersCompleted} passengers alighted. Current: ${tripDoc.passengerCount}`);
      }

      // Update bus current passengers
      if (trip.busId) {
        const busDoc = await Bus.findById(trip.busId).select('currentPassengers');
        if (busDoc) {
          busDoc.currentPassengers = Math.max(0, Number(busDoc.currentPassengers || 0) - passengersCompleted);
          await busDoc.save();

          // Emit occupancy update to passengers and driver viewing this bus
          if (io) {
            io.to(`bus:${String(trip.busId)}`).emit('trip:occupancy-updated', {
              tripId: String(trip._id),
              busId: String(trip.busId),
              passengerCount: busDoc.currentPassengers,
              eventType: 'trip-end',
              passengersAlighted: passengersCompleted,
              timestamp: new Date().toISOString(),
            });

            console.log(`📲 Occupancy update emitted for bus ${trip.busId}: ${busDoc.currentPassengers} passengers remaining`);
          }
        }
      }
    } catch (err) {
      console.error('Error updating occupancy on trip end:', err);
    }
  }
  // ========== END NEW ==========

  // ========== NEW: Handle no-show bookings (confirmed but never boarded) ==========
  const noShowFilter = {
    routeId: trip.routeId,
    busId: trip.busId,
    scheduleId: trip.scheduleId,
    serviceDate: tripDate,
    status: 'confirmed', // Bookings that were never boarded
    $or: [
      { tripSessionId: trip._id },
      { tripSessionId: { $exists: false } },
      { tripSessionId: null },
    ],
  };

  const noShowCandidates = await Booking.find(noShowFilter)
    .select('_id bookingCode passengerId')
    .lean();

  if (noShowCandidates.length > 0) {
    const noShowResult = await Booking.updateMany(
      noShowFilter,
      {
        $set: {
          status: 'cancelled',
          cancelledAt: transitionTime,
          cancellationReason: 'No-show - Did not board the bus',
          tripSessionId: trip._id,
        },
      }
    );

    const noShowBookings = noShowCandidates.map((row) => ({
      bookingId: String(row._id),
      bookingCode: row.bookingCode,
      passengerId: String(row.passengerId),
      status: 'cancelled',
      cancelledAt: transitionTime,
      reason: 'No-show - Did not board the bus',
    }));

    changedBookings.push(...noShowBookings);

    console.log(`⚠️ No-show bookings marked as cancelled for trip ${trip._id}: ${noShowResult.modifiedCount} bookings`);

    // ========== NEW: Send no-show notifications to passengers ==========
    try {
      const io = getIoInstance();
      const Bus_doc = await Bus.findById(trip.busId).select('busNumber').lean();
      const Route_doc = await Route.findById(trip.routeId).select('routeName source destination').lean();

      for (const noShowBooking of noShowBookings) {
        if (noShowBooking.passengerId) {
          try {
            // Fetch passenger details
            const passengerDoc = await Passenger.findById(noShowBooking.passengerId)
              .select('firstName lastName email')
              .lean();

            if (passengerDoc) {
              const passengerName = `${passengerDoc.firstName} ${passengerDoc.lastName}`.trim();
              const busNumber = Bus_doc?.busNumber || 'Unknown';
              const routeName = Route_doc?.routeName || 'Unknown Route';
              const source = Route_doc?.source || 'Unknown';
              const destination = Route_doc?.destination || 'Unknown';

              // Create database notification
              const notifMessage = `You missed your trip on ${busNumber} from ${source} to ${destination}. Your booking (${noShowBooking.bookingCode}) has been cancelled.`;
              
              const noShowNotif = await Notification.create({
                notificationId: `notif_${uuidv4()}`,
                title: 'You Missed Your Trip',
                message: notifMessage,
                sentBy: 'system',
                targetAudience: 'specific_user',
                targetUserIds: [noShowBooking.passengerId],
                status: 'sent',
                type: 'alert',
                severity: 'medium',
              });

              // Emit via socket.io to passenger
              if (io) {
                io.to(`passenger:${String(noShowBooking.passengerId)}`).emit('trip:missed', {
                  _id: String(noShowNotif._id),
                  notificationId: noShowNotif.notificationId,
                  title: 'You Missed Your Trip',
                  message: notifMessage,
                  type: 'alert',
                  severity: 'medium',
                  bookingCode: noShowBooking.bookingCode,
                  busNumber,
                  route: `${source} → ${destination}`,
                  cancelledAt: noShowBooking.cancelledAt,
                  createdAt: new Date(),
                });

                console.log(`📲 No-show notification sent to passenger ${noShowBooking.passengerId}: ${noShowBooking.bookingCode}`);
              }
            }
          } catch (notifErr) {
            console.error(`Failed to send no-show notification to passenger ${noShowBooking.passengerId}:`, notifErr);
            // Don't fail the entire process if one notification fails
          }
        }
      }
    } catch (notifError) {
      console.error('Error sending no-show notifications:', notifError);
      // Don't fail the booking cancellation if notifications fail
    }
    // ========== END NEW ==========
  }
  // ========== END NEW ==========

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
 * Get current date/time parts in app timezone.
 */
const getNowInTimezoneParts = () => {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'long',
    hour12: false,
  });

  const parts = dtf.formatToParts(new Date());
  const pick = (type) => parts.find((p) => p.type === type)?.value;

  return {
    year: Number(pick('year')),
    month: Number(pick('month')),
    day: Number(pick('day')),
    hour: Number(pick('hour')),
    minute: Number(pick('minute')),
    weekday: pick('weekday') || '',
  };
};

const getCurrentTimeInMinutes = () => {
  const now = getNowInTimezoneParts();
  return now.hour * 60 + now.minute;
};

const getTodayDateInTimezoneAsUtcMidnight = () => {
  const now = getNowInTimezoneParts();
  if ([now.year, now.month, now.day].some((value) => Number.isNaN(value))) {
    return null;
  }
  return new Date(Date.UTC(now.year, now.month - 1, now.day));
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

const ensureMissedTripSession = async ({ routeId, busId, schedule, serviceDate }) => {
  const normalizedServiceDate = normalizeDateOnly(serviceDate || new Date());
  if (!normalizedServiceDate) {
    return { trip: null, created: false };
  }
  const dayEnd = new Date(normalizedServiceDate.getTime() + 24 * 60 * 60 * 1000);

  const existing = await TripSession.findOne({
    routeId,
    busId,
    scheduleId: schedule._id,
    startTime: { $gte: normalizedServiceDate, $lt: dayEnd },
  });

  if (existing) return { trip: existing, created: false };

  const missedTrip = await TripSession.create({
    driverId: schedule.driverId,
    routeId,
    busId,
    scheduleId: schedule._id,
    status: 'missed',
    startTime: combineDateAndTimeUtc(normalizedServiceDate, schedule.startTime),
    endTime: combineDateAndTimeUtc(normalizedServiceDate, schedule.endTime),
    notes: 'Auto-marked as missed: trip not started before schedule end time',
  });

  return { trip: missedTrip, created: true };
};

/**
 * Process all missed trips for today
 * Call this periodically (e.g., every hour) or after schedule end time
 */
const processMissedTripsForToday = async ({io}) => {
  try {
    const today = getTodayDateInTimezoneAsUtcMidnight();
    if (!today) {
      return { processed: 0, totalCancelled: 0, errors: [] };
    }

    const dayName = getNowInTimezoneParts().weekday;

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

          if (result.reason !== 'Trip already started') {
            const missedSession = await ensureMissedTripSession({
              routeId: route._id,
              busId: schedule.busId,
              schedule,
              serviceDate: today,
            });

            if (missedSession.created) {
              await notifyMissedTrip({
                io,
                route,
                schedule,
                busId: schedule.busId,
                changedBookings: result.changedBookings || [],
              });

              totalProcessed++;
              totalCancelled += result.modified;
              console.log(
                `📋 Missed trip processed - Route: ${route._id}, Schedule: ${schedule._id}, Cancelled: ${result.modified}`
              );
            }
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
