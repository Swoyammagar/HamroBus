const Booking = require('../models/booking.model');
const Route = require('../models/route.model');
const TripSession = require('../models/tripSession.model');

const normalizeDateOnly = (value) => {
  const input = value ? new Date(value) : new Date();
  if (Number.isNaN(input.getTime())) {
    return null;
  }
  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate()));
};

const syncBookingsOnTripStart = async ({ trip }) => {
  if (!trip || !trip.routeId || !trip.busId || !trip.scheduleId) {
    return { matched: 0, modified: 0 };
  }

  const serviceDate = normalizeDateOnly(trip.startTime || new Date());
  if (!serviceDate) {
    return { matched: 0, modified: 0 };
  }

  const result = await Booking.updateMany(
    {
      routeId: trip.routeId,
      busId: trip.busId,
      scheduleId: trip.scheduleId,
      serviceDate,
      status: 'confirmed',
    },
    {
      $set: {
        status: 'in-progress',
        tripSessionId: trip._id,
        startedAt: new Date(),
      },
    }
  );

  return {
    matched: result.matchedCount || 0,
    modified: result.modifiedCount || 0,
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
    return { matched: 0, modified: 0 };
  }
  const tripDate = normalizeDateOnly(trip.startTime || trip.endTime ||new Date());

  if (!tripDate) {
    return { matched: 0, modified: 0 };
  }

  const result = await Booking.updateMany({
    routeId: trip.routeId,
    busId: trip.busId,
    scheduleId: trip.scheduleId,
    serviceDate: tripDate,
    status: {$in: ['in-progress', 'on-break']},
    $or: [
      { tripSessionId: trip._id },
      { tripSessionId: {$exists: false} },
      { tripSessionId: null },
    ],
  },
  {
    $set: {
      status: 'completed',
      completedAt: new Date(),
      tripSessionId: trip._id,
    },
  }
  );

  return {
    matched: result.matchedCount || 0,
    modified: result.modifiedCount || 0,
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
    return { matched: 0, modified: 0, reason: 'Missing required parameters' };
  }

  // Normalize the service date
  const normalizedServiceDate = normalizeDateOnly(serviceDate);
  if (!normalizedServiceDate) {
    return { matched: 0, modified: 0, reason: 'Invalid service date' };
  }

  // Check if the schedule's end time has passed
  if (!isPastScheduleEndTime(endTime)) {
    return { matched: 0, modified: 0, reason: 'Schedule end time not yet reached' };
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
    return { matched: 0, modified: 0, reason: 'Trip already started' };
  }

  // Cancel confirmed bookings for this trip
  const result = await Booking.updateMany(
    {
      routeId,
      busId,
      scheduleId,
      serviceDate: normalizedServiceDate,
      status: 'confirmed',
    },
    {
      $set: {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancellationReason: 'Trip was not started by the scheduled departure time',
      },
    }
  );

  return {
    matched: result.matchedCount || 0,
    modified: result.modifiedCount || 0,
    reason: 'Bookings cancelled due to missed trip departure',
  };
};

/**
 * Process all missed trips for today
 * Call this periodically (e.g., every hour) or after schedule end time
 */
const processMissedTripsForToday = async () => {
  try {
    const today = normalizeDateOnly(new Date());
    if (!today) {
      return { processed: 0, totalCancelled: 0, errors: [] };
    }

    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    // Find all schedules for today that haven't had a trip started
    const schedules = await Route.find({}, 'schedules').lean();
    
    let totalProcessed = 0;
    let totalCancelled = 0;
    const errors = [];

    for (const route of schedules) {
      if (!route.schedules) continue;

      for (const schedule of route.schedules) {
        try {
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
