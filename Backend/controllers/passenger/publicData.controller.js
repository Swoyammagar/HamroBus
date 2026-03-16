const Route = require('../../models/route.model');
const Bus = require('../../models/bus.model');
const Driver = require('../../models/driver.model');

const mapStop = (stop, index) => ({
  id: stop._id ? stop._id.toString() : `stop-${index}`,
  name: stop.stopName,
  latitude: stop.latitude,
  longitude: stop.longitude,
  estimatedArrival: stop.estimatedArrival || null,
  order: stop.sequence,
});

const mapRoute = (route) => ({
  _id: route._id,
  name: route.routeName,
  source: route.source,
  destination: route.destination,
  distance: route.distance,
  fareInfo: route.fareInfo,
  busesCount: Array.isArray(route.assignedBusIds) ? route.assignedBusIds.length : 0,
  stops: Array.isArray(route.stops) ? route.stops.map(mapStop) : [],
  isActive: true,
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

    return res.status(200).json({ schedules: route.schedules || [] });
  } catch (error) {
    console.error('Route schedules error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const getPublicBuses = async (req, res) => {
  try {
    const buses = await Bus.find()
      .populate('assignedDriverId', 'firstName lastName licenseNo profileImgUrl')
      .populate('assignedRouteId', 'routeName')
      .lean();

    const formatted = buses.map(mapBus);
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
      .populate('assignedDriverId', 'firstName lastName licenseNo profileImgUrl')
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
      .populate('assignedDriverId', 'firstName lastName licenseNo profileImgUrl')
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
    const driver = await Driver.findById(driverId).select('firstName lastName email phoneNumber licenseNo profileImgUrl');
    if (!driver) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    return res.status(200).json({ driver });
  } catch (error) {
    console.error('Public driver error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  getPublicRoutes,
  getPublicRouteById,
  searchPublicRoutes,
  getPublicRouteSchedules,
  getPublicBuses,
  getPublicBusesByRoute,
  getPublicBusById,
  getPublicDriverById,
};