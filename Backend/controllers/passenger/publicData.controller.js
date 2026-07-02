const Route = require('../../models/route.model');
const Bus = require('../../models/bus.model');
const Driver = require('../../models/driver.model');
const TripSession = require('../../models/tripSession.model');
const Review = require('../../models/review.model');
const { calculateDistance } = require('../../services/distanceUtils');

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseTimeToMinutes = (value) => {
  if (!value || typeof value !== 'string') return null;
  const [hours, minutes] = value.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const getNextServiceDate = ({ dayOfWeek, startTime, endTime, tripSession }) => {
  const today = new Date();
  const targetDay = DAYS.indexOf(dayOfWeek);
  if (targetDay < 0) return toDateKey(today);

  const todayDay = today.getDay();
  const daysUntil = (targetDay - todayDay + 7) % 7;
  const candidate = new Date(today);
  candidate.setDate(candidate.getDate() + daysUntil);

  if (daysUntil > 0) {
    return toDateKey(candidate);
  }

  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const endMinutes = parseTimeToMinutes(endTime);
  const closedStatuses = ['completed', 'cancelled'];
  const tripAlreadyClosed = tripSession && closedStatuses.includes(String(tripSession.status));

  if (tripAlreadyClosed || (endMinutes !== null && nowMinutes > endMinutes)) {
    candidate.setDate(candidate.getDate() + 7);
  }

  return toDateKey(candidate);
};

const mapStop = (stop, index) => ({
  id: stop._id ? stop._id.toString() : `stop-${index}`,
  name: stop.stopName,
  latitude: stop.latitude,
  longitude: stop.longitude,
  estimatedArrival: stop.estimatedArrival || null,
  order: stop.sequence,
});

const parseCoordinate = (value) => {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
};

const mapRoute = (route, extra = {}) => ({
  _id: route._id,
  name: route.routeName,
  source: route.source,
  destination: route.destination,
  distance: route.distance,
  fareInfo: route.fareInfo,
  busesCount: Array.isArray(route.assignedBusIds) ? route.assignedBusIds.length : 0,
  stops: Array.isArray(route.stops) ? route.stops.map(mapStop) : [],
  isActive: true,
  ...extra,
});

const mapBus = (bus) => ({
  _id: bus._id,
  busNumber: bus.busNumber,
  capacity: bus.capacity,
  routeId: bus.assignedRouteId ? bus.assignedRouteId._id || bus.assignedRouteId : null,
  driverId: bus.assignedDriverId ? bus.assignedDriverId._id || bus.assignedDriverId : null,
  driverName: bus.assignedDriverId
    ? `${bus.assignedDriverId.firstName || ''} ${bus.assignedDriverId.lastName || ''}`.trim()
    : undefined,
  driverPhoto: bus.assignedDriverId?.profileImgUrl || undefined,
  driverRatingAverage: Number(bus.assignedDriverId?.ratingAverage || 0),
  driverRatingCount: Number(bus.assignedDriverId?.ratingCount || 0),
  currentPassengers: bus.currentPassengers,
  status: bus.status,
});

const getPublicRoutes = async (req, res) => {
  try {
    const routes = await Route.find()
      .populate('assignedBusIds', 'busNumber')
      .lean();

    const formatted = routes.map(mapRoute);
    return res.status(200).json({ routes: formatted });
  } catch (error) {
    console.error('Public routes error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getNearbyPublicRoutes = async (req, res) => {
  const lat = parseCoordinate(req.query.lat);
  const lng = parseCoordinate(req.query.lng);

  if (lat === null || lng === null) {
    return res.status(400).json({ message: 'Valid lat and lng query parameters are required' });
  }

  try {
    const routes = await Route.find()
      .populate('assignedBusIds', 'busNumber')
      .lean();

    const formatted = routes
      .map((route) => {
        const orderedStops = Array.isArray(route.stops)
          ? [...route.stops].sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0))
          : [];
        const usableStops = orderedStops.slice(0, -1);

        if (usableStops.length === 0) {
          return null;
        }

        const closestDistance = usableStops.reduce((minimum, stop) => {
          const stopLat = parseCoordinate(stop.latitude);
          const stopLng = parseCoordinate(stop.longitude);

          if (stopLat === null || stopLng === null) {
            return minimum;
          }

          const distance = calculateDistance(lat, lng, stopLat, stopLng);
          return distance < minimum ? distance : minimum;
        }, Infinity);

        if (!Number.isFinite(closestDistance)) {
          return null;
        }

        return mapRoute(route, { closestDistance });
      })
      .filter(Boolean)
      .sort((a, b) => a.closestDistance - b.closestDistance);

    return res.status(200).json({ routes: formatted });
  } catch (error) {
    console.error('Nearby public routes error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPublicRouteById = async (req, res) => {
  const { routeId } = req.params;
  try {
    const route = await Route.findById(routeId)
      .populate('assignedBusIds', 'busNumber')
      .lean();

    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    return res.status(200).json({ route: mapRoute(route) });
  } catch (error) {
    console.error('Public route error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const searchPublicRoutes = async (req, res) => {
  const { q } = req.query;
  const searchValue = (q || '').toString().trim();

  if (!searchValue) {
    return getPublicRoutes(req, res);
  }

  try {
    const regex = new RegExp(searchValue, 'i');
    const routes = await Route.find({
      $or: [
        { routeName: regex },
        { source: regex },
        { destination: regex },
        { 'stops.stopName': regex },
      ],
    })
      .populate('assignedBusIds', 'busNumber')
      .lean();

    const formatted = routes.map(mapRoute);
    return res.status(200).json({ routes: formatted });
  } catch (error) {
    console.error('Search routes error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPublicRouteSchedules = async (req, res) => {
  const { routeId } = req.params;
  try {
    const route = await Route.findById(routeId)
      .populate('schedules.driverId', 'firstName lastName licenseNo')
      .populate('schedules.busId', 'busNumber model')
      .lean();

    if (!route) {
      return res.status(404).json({ message: 'Route not found' });
    }

    const scheduleIds = (route.schedules || []).map((schedule) => schedule._id);
    const today = new Date();
    const dayStart = new Date(today);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const tripSessions = await TripSession.find({
      routeId: route._id,
      scheduleId: { $in: scheduleIds },
      startTime: { $gte: dayStart, $lt: dayEnd },
      status: { $in: ['in-progress', 'on-break', 'completed', 'cancelled'] },
    }).select('scheduleId status startTime endTime').lean();

    const tripSessionMap = new Map(
      tripSessions.map((trip) => [String(trip.scheduleId), trip])
    );

    const schedules = (route.schedules || []).map((schedule) => ({
      ...schedule,
      nextServiceDate: getNextServiceDate({
        dayOfWeek: schedule.dayOfWeek,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        tripSession: tripSessionMap.get(String(schedule._id)),
      }),
    }));

    return res.status(200).json({ schedules });
  } catch (error) {
    console.error('Route schedules error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPublicBuses = async (req, res) => {
  const lat = parseCoordinate(req.query.lat);
  const lng = parseCoordinate(req.query.lng);

  try {
    const buses = await Bus.find()
      .populate('assignedDriverId', 'firstName lastName licenseNo profileImgUrl ratingAverage ratingCount')
      .populate('assignedRouteId', 'routeName')
      .lean();

    const sortedBuses = lat === null || lng === null
      ? buses
      : [...buses].sort((a, b) => {
        const aLat = parseCoordinate(a.lastKnownLocation?.latitude);
        const aLng = parseCoordinate(a.lastKnownLocation?.longitude);
        const bLat = parseCoordinate(b.lastKnownLocation?.latitude);
        const bLng = parseCoordinate(b.lastKnownLocation?.longitude);
        const aDistance = aLat === null || aLng === null
          ? Infinity
          : calculateDistance(lat, lng, aLat, aLng);
        const bDistance = bLat === null || bLng === null
          ? Infinity
          : calculateDistance(lat, lng, bLat, bLng);

        return aDistance - bDistance;
      });

    const formatted = sortedBuses.map((bus) => {
      const mapped = mapBus(bus);
      const busLat = parseCoordinate(bus.lastKnownLocation?.latitude);
      const busLng = parseCoordinate(bus.lastKnownLocation?.longitude);

      if (lat !== null && lng !== null && busLat !== null && busLng !== null) {
        mapped.closestDistance = calculateDistance(lat, lng, busLat, busLng);
      }

      return mapped;
    });
    return res.status(200).json({ buses: formatted });
  } catch (error) {
    console.error('Public buses error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPublicBusesByRoute = async (req, res) => {
  const { routeId } = req.params;
  try {
    const buses = await Bus.find({ assignedRouteId: routeId })
      .populate('assignedDriverId', 'firstName lastName licenseNo profileImgUrl ratingAverage ratingCount')
      .populate('assignedRouteId', 'routeName')
      .lean();

    const formatted = buses.map(mapBus);
    return res.status(200).json({ buses: formatted });
  } catch (error) {
    console.error('Public buses by route error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPublicBusById = async (req, res) => {
  const { busId } = req.params;
  try {
    const bus = await Bus.findById(busId)
      .populate('assignedDriverId', 'firstName lastName licenseNo profileImgUrl ratingAverage ratingCount')
      .populate('assignedRouteId', 'routeName')
      .lean();

    if (!bus) {
      return res.status(404).json({ message: 'Bus not found' });
    }

    return res.status(200).json({ bus: mapBus(bus) });
  } catch (error) {
    console.error('Public bus by id error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPublicDriverById = async (req, res) => {
  const { driverId } = req.params;
  try {
    const driver = await Driver.findById(driverId).select('firstName lastName email phoneNumber licenseNo profileImgUrl ratingAverage ratingCount');
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    return res.status(200).json({ driver });
  } catch (error) {
    console.error('Public driver error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPublicDriverLatestReviews = async (req, res) => {
  const { driverId } = req.params;

  try {
    const exists = await Driver.exists({ _id: driverId });
    if (!exists) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    const reviews = await Review.find({ driverId })
      .populate('passengerId', 'firstName lastName profileImgUrl')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('rating comment reviewedAt createdAt passengerId');

    const formatted = reviews.map((item) => ({
      _id: item._id,
      rating: item.rating,
      comment: item.comment || '',
      reviewedAt: item.reviewedAt || item.createdAt,
      passenger: item.passengerId
        ? {
            _id: item.passengerId._id,
            firstName: item.passengerId.firstName || '',
            lastName: item.passengerId.lastName || '',
            profileImgUrl: item.passengerId.profileImgUrl || '',
          }
        : null,
    }));

    return res.status(200).json({ reviews: formatted });
  } catch (error) {
    console.error('Public driver latest reviews error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getPublicRoutes,
  getNearbyPublicRoutes,
  getPublicRouteById,
  searchPublicRoutes,
  getPublicRouteSchedules,
  getPublicBuses,
  getPublicBusesByRoute,
  getPublicBusById,
  getPublicDriverById,
  getPublicDriverLatestReviews,
};
