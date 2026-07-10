const normalizeStopName = (value) => String(value || '').trim().toLowerCase();

const getStopByName = (route, stopName) => {
  const normalized = normalizeStopName(stopName);
  if (!normalized || !Array.isArray(route?.stops)) return null;
  return route.stops.find((stop) => normalizeStopName(stop.stopName) === normalized) || null;
};

const calculateRouteFare = ({ route }) => {
  return Number(route?.fareInfo || 0);
};

module.exports = {
  calculateRouteFare,
  getStopByName,
};
