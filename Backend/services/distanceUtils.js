const TripSession = require('../models/tripSession.model');

/**
 * Calculate distance between two lat/lng points using Haversine formula
 * Returns distance in meters
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Get closest stop to current driver location
 * Returns stop if driver is within threshold, null otherwise
 */
const getClosestStop = (driverLat, driverLng, route) => {
  const PROXIMITY_THRESHOLD = 200; // meters

  if (!route || !route.stops || route.stops.length === 0) {
    return null;
  }

  let closestStop = null;
  let minDistance = PROXIMITY_THRESHOLD;

  for (const stop of route.stops) {
    const distance = calculateDistance(driverLat, driverLng, stop.latitude, stop.longitude);
    if (distance < minDistance) {
      minDistance = distance;
      closestStop = stop;
    }
  }

  return closestStop;
};

/**
 * Get current stop sequence from stop name
 * Used to compare if bus has passed a destination
 */
const getCurrentStopSequence = (stopName, route) => {
  if (!stopName || !route || !route.stops) {
    return -1;
  }

  const normalized = String(stopName || '').trim().toLowerCase();
  const stop = route.stops.find((s) => String(s.stopName || '').trim().toLowerCase() === normalized);
  return stop ? Number(stop.sequence) : -1;
};

/**
 * Get stop arrival time from schedule
 * Returns arrival time string (HH:MM) or null
 */
const getStopArrivalTime = (stopName, schedule) => {
  if (!stopName || !schedule || !schedule.stopArrivals) {
    return null;
  }

  const normalized = String(stopName || '').trim().toLowerCase();
  const arrival = schedule.stopArrivals.find((s) => String(s.stopName || '').trim().toLowerCase() === normalized);
  return arrival ? arrival.arrivalTime : null;
};

/**
 * Detect if driver has reached a new stop and update TripSession
 * Returns { currentStop, previousStop, changed: boolean }
 */
const detectAndUpdateCurrentStop = async (tripSession, driverLat, driverLng, route, schedule) => {
  try {
    if (!tripSession || !route) {
      return { currentStop: null, previousStop: null, changed: false };
    }

    // Get closest stop to current location
    const closestStop = getClosestStop(driverLat, driverLng, route);
    if (!closestStop) {
      return {
        currentStop: tripSession.currentStop || null,
        previousStop: null,
        changed: false,
      };
    }

    const newStopName = String(closestStop.stopName || '').trim();
    const currentStopName = tripSession.currentStop ? String(tripSession.currentStop || '').trim() : '';

    // Check if this is a new stop (different from current)
    if (newStopName.toLowerCase() === currentStopName.toLowerCase()) {
      // Same stop, no change
      return {
        currentStop: newStopName,
        previousStop: null,
        changed: false,
      };
    }

    // New stop detected - update trip session
    const previousStop = tripSession.currentStop;
    tripSession.currentStop = newStopName;
    await tripSession.save();

    console.log(`✅ [STOP UPDATE] Trip ${tripSession._id}: ${previousStop || 'START'} → ${newStopName}`);

    return {
      currentStop: newStopName,
      previousStop: previousStop || null,
      changed: true,
      stopSequence: closestStop.sequence,
      eta: getStopArrivalTime(newStopName, schedule),
    };
  } catch (error) {
    console.error('Error detecting/updating current stop:', error);
    return {
      currentStop: tripSession?.currentStop || null,
      previousStop: null,
      changed: false,
    };
  }
};

module.exports = {
  calculateDistance,
  getClosestStop,
  getCurrentStopSequence,
  getStopArrivalTime,
  detectAndUpdateCurrentStop,
};
