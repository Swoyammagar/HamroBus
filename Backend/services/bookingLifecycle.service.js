const Booking = require('../models/booking.model');
const Route = require('../models/route.model');

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
  if (!trip || !trip._id) {
    return { matched: 0, modified: 0 };
  }

  const result = await Booking.updateMany(
    {
      tripSessionId: trip._id,
      status: 'in-progress',
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

module.exports = {
  syncBookingsOnTripStart,
  completeBookingsByReachedStop,
  completeAllInProgressBookingsForTrip,
};
