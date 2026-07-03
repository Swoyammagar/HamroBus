const { calculateDistance } = require('./distanceUtils');

const SPEED_SAMPLE_SIZE = Number(process.env.ETA_SPEED_SAMPLE_SIZE || 8);
const MIN_AVERAGE_SPEED_MPS = Number(process.env.ETA_MIN_AVERAGE_SPEED_MPS || 1);
const MAX_REASONABLE_SPEED_MPS = Number(process.env.ETA_MAX_REASONABLE_SPEED_MPS || 35);

const speedSamplesByTrip = new Map();

const sortStopsBySequence = (stops = []) =>
  [...stops].sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0));

const getClosestRouteStop = ({ latitude, longitude, route }) => {
  const stops = sortStopsBySequence(route?.stops || []);
  if (!stops.length) return null;

  return stops.reduce((closest, stop) => {
    const distanceMeters = calculateDistance(
      Number(latitude),
      Number(longitude),
      Number(stop.latitude),
      Number(stop.longitude)
    );

    if (!closest || distanceMeters < closest.distanceMeters) {
      return { stop, distanceMeters };
    }

    return closest;
  }, null);
};

const calculateRemainingRouteDistanceMeters = ({ latitude, longitude, route, fromSequence, toSequence }) => {
  const stops = sortStopsBySequence(route?.stops || []);
  if (!stops.length || Number(fromSequence) >= Number(toSequence)) {
    return 0;
  }

  const fromStop = stops.find((stop) => Number(stop.sequence) === Number(fromSequence));
  if (!fromStop) return null;

  let distanceMeters = calculateDistance(
    Number(latitude),
    Number(longitude),
    Number(fromStop.latitude),
    Number(fromStop.longitude)
  );

  const remainingStops = stops.filter(
    (stop) => Number(stop.sequence) >= Number(fromSequence) && Number(stop.sequence) <= Number(toSequence)
  );

  for (let index = 0; index < remainingStops.length - 1; index += 1) {
    const current = remainingStops[index];
    const next = remainingStops[index + 1];
    distanceMeters += calculateDistance(
      Number(current.latitude),
      Number(current.longitude),
      Number(next.latitude),
      Number(next.longitude)
    );
  }

  return distanceMeters;
};

const recordLocationUpdate = ({ tripId, latitude, longitude, timestamp = new Date() }) => {
  if (!tripId || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude))) {
    return null;
  }

  const key = String(tripId);
  const timestampMs = new Date(timestamp).getTime();
  const history = speedSamplesByTrip.get(key) || [];
  const previous = history[history.length - 1] || null;

  const nextSample = {
    latitude: Number(latitude),
    longitude: Number(longitude),
    timestampMs,
    speedMps: null,
  };

  if (previous && timestampMs > previous.timestampMs) {
    const distanceMeters = calculateDistance(
      previous.latitude,
      previous.longitude,
      nextSample.latitude,
      nextSample.longitude
    );
    const seconds = (timestampMs - previous.timestampMs) / 1000;
    const speedMps = seconds > 0 ? distanceMeters / seconds : null;

    if (
      Number.isFinite(speedMps) &&
      speedMps >= 0 &&
      speedMps <= MAX_REASONABLE_SPEED_MPS
    ) {
      nextSample.speedMps = speedMps;
    }
  }

  history.push(nextSample);
  speedSamplesByTrip.set(key, history.slice(-SPEED_SAMPLE_SIZE));

  return getAverageVehicleSpeedMps(key);
};

const getAverageVehicleSpeedMps = (tripId) => {
  const samples = speedSamplesByTrip.get(String(tripId)) || [];
  const speeds = samples
    .map((sample) => sample.speedMps)
    .filter((speed) => Number.isFinite(speed) && speed > 0);

  if (!speeds.length) return null;

  const average = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
  return average >= MIN_AVERAGE_SPEED_MPS ? average : null;
};

const calculateEtaToStop = ({ tripId, latitude, longitude, route, boardingStopSequence }) => {
  const closest = getClosestRouteStop({ latitude, longitude, route });
  if (!closest) {
    return { canCalculate: false, reason: 'NO_ROUTE_STOPS' };
  }

  const closestStopSequence = Number(closest.stop.sequence);
  const targetSequence = Number(boardingStopSequence);

  if (!Number.isFinite(targetSequence) || closestStopSequence >= targetSequence) {
    return {
      canCalculate: false,
      reason: 'STOP_REACHED_OR_PASSED',
      closestStop: closest.stop,
      closestStopSequence,
      targetSequence,
    };
  }

  const remainingDistanceMeters = calculateRemainingRouteDistanceMeters({
    latitude,
    longitude,
    route,
    fromSequence: closestStopSequence,
    toSequence: targetSequence,
  });
  const averageSpeedMps = getAverageVehicleSpeedMps(tripId);

  if (!Number.isFinite(remainingDistanceMeters) || !averageSpeedMps) {
    return {
      canCalculate: false,
      reason: !averageSpeedMps ? 'INSUFFICIENT_SPEED_HISTORY' : 'INVALID_DISTANCE',
      closestStop: closest.stop,
      closestStopSequence,
      targetSequence,
      remainingDistanceMeters,
      averageSpeedMps,
    };
  }

  const etaSeconds = remainingDistanceMeters / averageSpeedMps;
  const etaMinutes = etaSeconds / 60;

  return {
    canCalculate: true,
    closestStop: closest.stop,
    closestStopSequence,
    targetSequence,
    remainingDistanceMeters,
    averageSpeedMps,
    etaSeconds,
    etaMinutes,
  };
};

const clearTripSpeedHistory = (tripId) => {
  if (tripId) {
    speedSamplesByTrip.delete(String(tripId));
  }
};

module.exports = {
  recordLocationUpdate,
  getAverageVehicleSpeedMps,
  calculateEtaToStop,
  calculateRemainingRouteDistanceMeters,
  clearTripSpeedHistory,
};
