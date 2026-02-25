const TripSession = require('../models/tripSession.model');
const Driver = require('../models/driver.model');
const Route = require('../models/route.model');
const Bus = require('../models/bus.model');

// Get driver's assigned route with schedules
const getAssignedRoute = async (req, res) => {
    const driverId = req.user.id; // From JWT middleware

    try {
        const driver = await Driver.findById(driverId).populate({
            path: 'assignedBus',
            select: 'busNumber registrationNumber assignedRouteId _id'
        });

        if (!driver) {
            return res.status(404).json({ message: "Driver not found" });
        }

        if (!driver.assignedBus || !driver.assignedBus.assignedRouteId) {
            return res.status(404).json({ message: "No bus or route assigned to this driver" });
        }

        const routeId = driver.assignedBus.assignedRouteId;
        const busId = driver.assignedBus._id;

        // Fetch route separately to ensure schedules are properly populated
        const route = await Route.findById(routeId)
            .populate('assignedBusIds', 'busNumber model')
            .populate('assignedDriverIds', 'firstName lastName')
            .populate('schedules.driverId', 'firstName lastName licenseNo')
            .populate('schedules.busId', 'busNumber registrationNumber model');

        if (!route) {
            return res.status(404).json({ message: "Route not found" });
        }

        // Filter schedules for the current driver and bus
        const driverSchedules = (route.schedules || []).filter(
            schedule => {
                const scheduleDriverId = schedule.driverId?._id?.toString() || schedule.driverId?.toString();
                const scheduleBusId = schedule.busId?._id?.toString() || schedule.busId?.toString();
                return scheduleDriverId === driverId.toString() && scheduleBusId === busId.toString();
            }
        );

        console.log(`getAssignedRoute - Driver: ${driverId}, Bus: ${busId}`);
        console.log(`Total schedules in route: ${route.schedules?.length || 0}`);
        console.log(`Filtered driver schedules: ${driverSchedules.length}`);

        res.status(200).json({
            route: route,
            bus: {
                _id: driver.assignedBus._id,
                busNumber: driver.assignedBus.busNumber,
                registrationNumber: driver.assignedBus.registrationNumber
            },
            driverSchedules: driverSchedules
        });

    } catch (error) {
        console.error("Error fetching assigned route:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get driver's schedules for a specific date range
const getDriverSchedules = async (req, res) => {
    const driverId = req.user.id;
    const { days = 7 } = req.query; // Default 7 days

    try {
        const driver = await Driver.findById(driverId).populate({
            path: 'assignedBus',
            select: 'busNumber assignedRouteId _id'
        });

        if (!driver || !driver.assignedBus || !driver.assignedBus.assignedRouteId) {
            return res.status(404).json({ message: "No route assigned" });
        }

        const routeId = driver.assignedBus.assignedRouteId;
        const busId = driver.assignedBus._id;

        // Fetch route separately to ensure schedules are properly populated
        const route = await Route.findById(routeId)
            .populate('schedules.driverId', 'firstName lastName licenseNo')
            .populate('schedules.busId', 'busNumber model');

        if (!route) {
            return res.status(404).json({ message: "Route not found" });
        }

        // Filter schedules for this specific driver and bus
        const driverSchedules = (route.schedules || []).filter(
            schedule => {
                const scheduleDriverId = schedule.driverId?._id?.toString() || schedule.driverId?.toString();
                const scheduleBusId = schedule.busId?._id?.toString() || schedule.busId?.toString();
                return scheduleDriverId === driverId.toString() && scheduleBusId === busId.toString();
            }
        );

        console.log(`getDriverSchedules - Driver: ${driverId}, Bus: ${busId}`);
        console.log(`Total schedules in route: ${route.schedules?.length || 0}`);
        console.log(`Filtered driver schedules: ${driverSchedules.length}`);

        // Get upcoming trip sessions
        const upcomingTrips = await TripSession.find({
            driverId: driverId,
            status: { $in: ['scheduled', 'in-progress', 'on-break'] }
        })
            .populate('routeId', 'routeName source destination')
            .populate('busId', 'busNumber')
            .sort({ startTime: 1 })
            .limit(parseInt(days) * 3); // Rough estimate: 3 trips per day

        res.status(200).json({
            schedules: driverSchedules,
            upcomingTrips: upcomingTrips
        });

    } catch (error) {
        console.error("Error fetching driver schedules:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get current active trip for driver
const getCurrentTrip = async (req, res) => {
    const driverId = req.user.id;

    try {
        const currentTrip = await TripSession.findOne({
            driverId: driverId,
            status: { $in: ['in-progress', 'on-break'] }
        })
            .populate('routeId', 'routeName stops source destination')
            .populate('busId', 'busNumber registrationNumber')
            .populate('currentStop');

        if (!currentTrip) {
            return res.status(404).json({ message: "No active trip" });
        }

        res.status(200).json(currentTrip);

    } catch (error) {
        console.error("Error fetching current trip:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Start a trip
const startTrip = async (req, res) => {
    const driverId = req.user.id;
    const { routeId, busId, scheduleId } = req.body;

    try {
        if (!routeId) {
            return res.status(400).json({ message: "routeId is required" });
        }

        // Check if there's already an active trip
        const existingTrip = await TripSession.findOne({
            driverId: driverId,
            status: { $in: ['in-progress', 'on-break'] }
        });

        if (existingTrip) {
            return res.status(400).json({ message: "Driver already has an active trip" });
        }

        // Create new trip session
        const newTrip = new TripSession({
            driverId: driverId,
            routeId: routeId,
            busId: busId || null,
            scheduleId: scheduleId || null,
            status: 'in-progress',
            startTime: new Date(),
            passengerCount: 0,
            completedStops: [],
            breakHistory: []
        });

        await newTrip.save();

        // Populate the trip details
        await newTrip.populate('routeId', 'routeName stops source destination');
        await newTrip.populate('busId', 'busNumber');

        // Emit socket event for real-time updates
        const io = req.app.get('io');
        if (io) {
            io.emit('trip-started', {
                driverId: driverId,
                tripId: newTrip._id,
                status: 'in-progress',
                timestamp: new Date()
            });
        }

        res.status(201).json({
            message: "Trip started successfully",
            trip: newTrip
        });

    } catch (error) {
        console.error("Error starting trip:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// End a trip
const endTrip = async (req, res) => {
    const driverId = req.user.id;
    const { tripId } = req.body;

    try {
        if (!tripId) {
            return res.status(400).json({ message: "tripId is required" });
        }

        const trip = await TripSession.findOne({
            _id: tripId,
            driverId: driverId,
            status: { $in: ['in-progress', 'on-break'] }
        });

        if (!trip) {
            return res.status(404).json({ message: "Trip not found or already completed" });
        }

        trip.status = 'completed';
        trip.endTime = new Date();
        await trip.save();

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.emit('trip-ended', {
                driverId: driverId,
                tripId: trip._id,
                status: 'completed',
                timestamp: new Date()
            });
        }

        res.status(200).json({
            message: "Trip ended successfully",
            trip: trip
        });

    } catch (error) {
        console.error("Error ending trip:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Start a break
const startBreak = async (req, res) => {
    const driverId = req.user.id;
    const { tripId } = req.body;

    try {
        const trip = await TripSession.findOne({
            _id: tripId,
            driverId: driverId,
            status: 'in-progress'
        });

        if (!trip) {
            return res.status(404).json({ message: "Active trip not found" });
        }

        trip.status = 'on-break';
        trip.breakHistory.push({
            breakStartTime: new Date()
        });

        await trip.save();

        res.status(200).json({
            message: "Break started",
            trip: trip
        });

    } catch (error) {
        console.error("Error starting break:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// End a break
const endBreak = async (req, res) => {
    const driverId = req.user.id;
    const { tripId } = req.body;

    try {
        const trip = await TripSession.findOne({
            _id: tripId,
            driverId: driverId,
            status: 'on-break'
        });

        if (!trip) {
            return res.status(404).json({ message: "No active break found" });
        }

        // Calculate break duration
        const lastBreak = trip.breakHistory[trip.breakHistory.length - 1];
        if (lastBreak && !lastBreak.breakEndTime) {
            const breakEndTime = new Date();
            lastBreak.breakEndTime = breakEndTime;
            
            // Calculate duration in minutes
            const durationMs = breakEndTime - lastBreak.breakStartTime;
            const durationMinutes = Math.floor(durationMs / (1000 * 60));
            lastBreak.duration = durationMinutes;

            // Update total break time
            trip.totalBreakTime += durationMinutes;
        }

        trip.status = 'in-progress';
        await trip.save();

        res.status(200).json({
            message: "Break ended",
            trip: trip
        });

    } catch (error) {
        console.error("Error ending break:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update passenger count at a stop
const updatePassengerCount = async (req, res) => {
    const driverId = req.user.id;
    const { tripId, stopId, passengersBoarded, passengersAlighted } = req.body;

    try {
        const trip = await TripSession.findOne({
            _id: tripId,
            driverId: driverId
        });

        if (!trip) {
            return res.status(404).json({ message: "Trip not found" });
        }

        // Update passenger count
        trip.passengerCount += (passengersBoarded || 0) - (passengersAlighted || 0);

        // Add completed stop
        trip.completedStops.push({
            stopId: stopId,
            completionTime: new Date(),
            passengersBoarded: passengersBoarded || 0,
            passengersAlighted: passengersAlighted || 0
        });

        trip.currentStop = stopId;
        await trip.save();

        // Emit socket event for real-time updates
        const io = req.app.get('io');
        if (io) {
            io.emit('stop-completed', {
                tripId: tripId,
                stopId: stopId,
                passengerCount: trip.passengerCount,
                timestamp: new Date()
            });
        }

        res.status(200).json({
            message: "Passenger count updated",
            trip: trip
        });

    } catch (error) {
        console.error("Error updating passenger count:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get trip history
const getTripHistory = async (req, res) => {
    const driverId = req.user.id;
    const { limit = 20, skip = 0 } = req.query;

    try {
        const trips = await TripSession.find({
            driverId: driverId,
            status: 'completed'
        })
            .populate('routeId', 'routeName source destination')
            .populate('busId', 'busNumber')
            .sort({ endTime: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip));

        const total = await TripSession.countDocuments({
            driverId: driverId,
            status: 'completed'
        });

        res.status(200).json({
            trips: trips,
            total: total,
            hasMore: skip + trips.length < total
        });

    } catch (error) {
        console.error("Error fetching trip history:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports = {
    getAssignedRoute,
    getDriverSchedules,
    getCurrentTrip,
    startTrip,
    endTrip,
    startBreak,
    endBreak,
    updatePassengerCount,
    getTripHistory
};
