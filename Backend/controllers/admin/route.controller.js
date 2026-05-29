const Route = require("../../models/route.model");

const timeToMinutes = (timeValue) => {
    if (typeof timeValue !== 'string') {
        return null;
    }
    const parts = timeValue.split(':');
    if (parts.length !== 2) {
        return null;
    }
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
        return null;
    }
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
    }
    return (hours * 60) + minutes;
};

const hasScheduleOverlap = (route, scheduleInput, ignoreScheduleId) => {
    const startMinutes = timeToMinutes(scheduleInput.startTime);
    const endMinutes = timeToMinutes(scheduleInput.endTime);

    if (startMinutes === null || endMinutes === null) {
        return { error: "Invalid time format. Use HH:MM (24-hour)." };
    }
    if (startMinutes >= endMinutes) {
        return { error: "Schedule startTime must be before endTime." };
    }

    const conflicts = (route.schedules || []).some((schedule) => {
        if (ignoreScheduleId && schedule._id.toString() === ignoreScheduleId.toString()) {
            return false;
        }

        if (schedule.dayOfWeek !== scheduleInput.dayOfWeek) {
            return false;
        }

        const sameDriver = schedule.driverId?.toString() === scheduleInput.driverId?.toString();
        const sameBus = schedule.busId?.toString() === scheduleInput.busId?.toString();
        if (!sameDriver && !sameBus) {
            return false;
        }

        const existingStart = timeToMinutes(schedule.startTime);
        const existingEnd = timeToMinutes(schedule.endTime);
        if (existingStart === null || existingEnd === null) {
            return false;
        }

        return startMinutes < existingEnd && endMinutes > existingStart;
    });

    if (conflicts) {
        return { error: "Schedule overlaps with an existing driver or bus assignment." };
    }

    return { error: null };
};

const normalizeStopName = (value) => String(value || '').trim().toLowerCase();

const validateStopArrivals = (route, stopArrivals, scheduleInput) => {
    if (stopArrivals === undefined) {
        return { error: null, normalizedStopArrivals: undefined };
    }

    if (!Array.isArray(stopArrivals)) {
        return { error: "stopArrivals must be an array." };
    }

    const startMinutes = timeToMinutes(scheduleInput.startTime);
    const endMinutes = timeToMinutes(scheduleInput.endTime);
    if (startMinutes === null || endMinutes === null) {
        return { error: "Invalid schedule time format. Use HH:MM (24-hour)." };
    }

    const stopMap = new Map(
        (route.stops || []).map((stop) => [normalizeStopName(stop.stopName), stop])
    );
    const seenStops = new Set();

    const normalizedStopArrivals = [];
    for (const entry of stopArrivals) {
        const stopNameInput = entry?.stopName;
        const arrivalTime = entry?.arrivalTime;

        if (!stopNameInput || !arrivalTime) {
            return { error: "Each stopArrivals entry must include stopName and arrivalTime." };
        }

        const stopKey = normalizeStopName(stopNameInput);
        if (!stopMap.has(stopKey)) {
            return { error: `Stop '${stopNameInput}' does not exist on this route.` };
        }

        if (seenStops.has(stopKey)) {
            return { error: `Duplicate stop arrival for stop '${stopNameInput}'.` };
        }
        seenStops.add(stopKey);

        const arrivalMinutes = timeToMinutes(arrivalTime);
        if (arrivalMinutes === null) {
            return { error: `Invalid arrivalTime '${arrivalTime}' for stop '${stopNameInput}'. Use HH:MM (24-hour).` };
        }

        if (arrivalMinutes < startMinutes || arrivalMinutes > endMinutes) {
            return {
                error: `Arrival time for stop '${stopNameInput}' must be between schedule startTime and endTime.`
            };
        }

        const routeStop = stopMap.get(stopKey);
        normalizedStopArrivals.push({
            stopName: routeStop.stopName,
            stopSequence: routeStop.sequence,
            arrivalTime
        });
    }

    normalizedStopArrivals.sort((a, b) => Number(a.stopSequence) - Number(b.stopSequence));

    for (let i = 1; i < normalizedStopArrivals.length; i += 1) {
        const previous = normalizedStopArrivals[i - 1];
        const current = normalizedStopArrivals[i];
        const previousMinutes = timeToMinutes(previous.arrivalTime);
        const currentMinutes = timeToMinutes(current.arrivalTime);
        if (currentMinutes < previousMinutes) {
            return {
                error: `Arrival times must be in route order. '${current.stopName}' cannot be earlier than '${previous.stopName}'.`
            };
        }
    }

    return { error: null, normalizedStopArrivals };
};

const createRoute = async (req, res) => {
    const {
        routeNumber,
        routeName,
        source,
        destination,
        distance,
        estimatedDuration,
        stops,
        assignedBusIds,
        assignedDriverIds,
        operatingDays,
        firstBusTiming,
        lastBusTiming,
        fareInfo
    } = req.body;

    try {
        if (!routeNumber || !routeName || !source || !destination || !distance || !operatingDays || !firstBusTiming || !lastBusTiming || !fareInfo) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const existingRoute = await Route.findOne({ routeNumber });

        if (existingRoute) {
            return res.status(400).json({ message: "Route with this number already exists" });
        }

        const newRoute = new Route({
            routeNumber,
            routeName,
            source,
            destination,
            distance,
            estimatedDuration,
            stops: stops || [],
            assignedBusIds: assignedBusIds || [],
            assignedDriverIds: assignedDriverIds || [],
            operatingDays,
            firstBusTiming,
            lastBusTiming,
            fareInfo
        });

        await newRoute.save();
        return res.status(201).json({ message: "Route created successfully", route: newRoute });
    } catch (error) {
        console.error("Error creating route:", error);
        return res.status(500).json({ 
            message: "Server error", 
            error: error.message,
            details: error.toString() 
        });
    }
};

const getAllRoutes = async (req, res) => {
    try {
        const routes = await Route.find()
            .populate('assignedBusIds', 'busNumber model')
            .populate('assignedDriverIds', 'firstName lastName email licenseNo')
            .populate('schedules.driverId', 'firstName lastName email licenseNo')
            .populate('schedules.busId', 'busNumber model');
        return res.status(200).json({ routes });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

const getRouteById = async (req, res) => {
    const { routeId } = req.params;

    try {
        const route = await Route.findById(routeId)
            .populate('assignedBusIds', 'busNumber model')
            .populate('assignedDriverIds', 'firstName lastName email licenseNo')
            .populate('schedules.driverId', 'firstName lastName email licenseNo')
            .populate('schedules.busId', 'busNumber model');

        if (!route) {
            return res.status(404).json({ message: "Route not found" });
        }

        return res.status(200).json({ route });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

const updateRoute = async (req, res) => {
    const { routeId } = req.params;
    const {
        routeNumber,
        routeName,
        source,
        destination,
        distance,
        estimatedDuration,
        stops,
        assignedBusIds,
        assignedDriverIds,
        operatingDays,
        firstBusTiming,
        lastBusTiming,
        fareInfo
    } = req.body;

    try {
        const route = await Route.findById(routeId);
        if (!route) {
            return res.status(404).json({ message: "Route not found" });
        }

        if (routeNumber) route.routeNumber = routeNumber;
        if (routeName) route.routeName = routeName;
        if (source) route.source = source;
        if (destination) route.destination = destination;
        if (distance !== undefined) route.distance = distance;
        if (estimatedDuration !== undefined) route.estimatedDuration = estimatedDuration;
        if (stops) route.stops = stops;
        if (assignedBusIds) route.assignedBusIds = assignedBusIds;
        if (assignedDriverIds) route.assignedDriverIds = assignedDriverIds;
        if (operatingDays) route.operatingDays = operatingDays;
        if (firstBusTiming) route.firstBusTiming = firstBusTiming;
        if (lastBusTiming) route.lastBusTiming = lastBusTiming;
        if (fareInfo !== undefined) route.fareInfo = fareInfo;

        await route.save();
        return res.status(200).json({ message: "Route updated successfully", route });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

const deleteRoute = async (req, res) => {
    const { routeId } = req.params;
    try {
        const route = await Route.findByIdAndDelete(routeId);
        if (!route) {
            return res.status(404).json({ message: "Route not found" });
        }
        return res.status(200).json({ message: "Route deleted successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

const getRouteSchedules = async (req, res) => {
    const { routeId } = req.params;
    try {
        const route = await Route.findById(routeId)
            .populate('schedules.driverId', 'firstName lastName email licenseNo')
            .populate('schedules.busId', 'busNumber model');

        if (!route) {
            return res.status(404).json({ message: "Route not found" });
        }

        return res.status(200).json({ schedules: route.schedules || [] });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

const addSchedule = async (req, res) => {
    const { routeId } = req.params;
    const { dayOfWeek, driverId, busId, startTime, endTime, notes, stopArrivals } = req.body;

    try {
        if (!dayOfWeek || !driverId || !busId || !startTime || !endTime) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const route = await Route.findById(routeId);
        if (!route) {
            return res.status(404).json({ message: "Route not found" });
        }

        if (route.operatingDays && !route.operatingDays.includes(dayOfWeek)) {
            return res.status(400).json({ message: "Schedule day is not in route operating days" });
        }

        const { error: overlapError } = hasScheduleOverlap(route, { dayOfWeek, driverId, busId, startTime, endTime });
        if (overlapError) {
            return res.status(400).json({ message: overlapError });
        }

        const { error: stopArrivalError, normalizedStopArrivals } = validateStopArrivals(
            route,
            stopArrivals,
            { startTime, endTime }
        );
        if (stopArrivalError) {
            return res.status(400).json({ message: stopArrivalError });
        }

        route.schedules.push({
            dayOfWeek,
            driverId,
            busId,
            startTime,
            endTime,
            notes,
            stopArrivals: normalizedStopArrivals || []
        });
        await route.save();

        return res.status(201).json({ message: "Schedule added successfully", schedules: route.schedules });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

const updateSchedule = async (req, res) => {
    const { routeId, scheduleId } = req.params;
    const { dayOfWeek, driverId, busId, startTime, endTime, notes, stopArrivals } = req.body;

    try {
        const route = await Route.findById(routeId);
        if (!route) {
            return res.status(404).json({ message: "Route not found" });
        }

        const schedule = route.schedules.id(scheduleId);
        if (!schedule) {
            return res.status(404).json({ message: "Schedule not found" });
        }

        const nextSchedule = {
            dayOfWeek: dayOfWeek || schedule.dayOfWeek,
            driverId: driverId || schedule.driverId,
            busId: busId || schedule.busId,
            startTime: startTime || schedule.startTime,
            endTime: endTime || schedule.endTime
        };

        const { error: overlapError } = hasScheduleOverlap(route, nextSchedule, scheduleId);
        if (overlapError) {
            return res.status(400).json({ message: overlapError });
        }

        const { error: stopArrivalError, normalizedStopArrivals } = validateStopArrivals(
            route,
            stopArrivals !== undefined ? stopArrivals : (schedule.stopArrivals || []),
            {
                startTime: nextSchedule.startTime,
                endTime: nextSchedule.endTime
            }
        );
        if (stopArrivalError) {
            return res.status(400).json({ message: stopArrivalError });
        }

        if (dayOfWeek) {
            if (route.operatingDays && !route.operatingDays.includes(dayOfWeek)) {
                return res.status(400).json({ message: "Schedule day is not in route operating days" });
            }
            schedule.dayOfWeek = dayOfWeek;
        }
        if (driverId) schedule.driverId = driverId;
        if (busId) schedule.busId = busId;
        if (startTime) schedule.startTime = startTime;
        if (endTime) schedule.endTime = endTime;
        if (notes !== undefined) schedule.notes = notes;
        if (normalizedStopArrivals !== undefined) schedule.stopArrivals = normalizedStopArrivals;

        await route.save();
        return res.status(200).json({ message: "Schedule updated successfully", schedule });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

const deleteSchedule = async (req, res) => {
    const { routeId, scheduleId } = req.params;

    try {
        const route = await Route.findById(routeId);
        if (!route) {
            return res.status(404).json({ message: "Route not found" });
        }

        const schedule = route.schedules.id(scheduleId);
        if (!schedule) {
            return res.status(404).json({ message: "Schedule not found" });
        }

        schedule.deleteOne();
        await route.save();

        return res.status(200).json({ message: "Schedule deleted successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

const getRouteStopArrivals = async (req, res) => {
    const { routeId, stopName } = req.params;
    const normalizedStopName = normalizeStopName(decodeURIComponent(stopName || ''));

    try {
        if (!normalizedStopName) {
            return res.status(400).json({ message: "stopName is required" });
        }

        const route = await Route.findById(routeId)
            .populate('schedules.driverId', 'firstName lastName email')
            .populate('schedules.busId', 'busNumber model');

        if (!route) {
            return res.status(404).json({ message: "Route not found" });
        }

        const routeStop = (route.stops || []).find(
            (stop) => normalizeStopName(stop.stopName) === normalizedStopName
        );

        if (!routeStop) {
            return res.status(404).json({ message: "Stop not found on this route" });
        }

        const dayOrder = {
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6,
            Sunday: 7
        };

        const arrivals = (route.schedules || [])
            .map((schedule) => {
                const stopArrival = (schedule.stopArrivals || []).find(
                    (entry) => normalizeStopName(entry.stopName) === normalizedStopName
                );
                if (!stopArrival) {
                    return null;
                }

                return {
                    scheduleId: schedule._id,
                    dayOfWeek: schedule.dayOfWeek,
                    busId: schedule.busId?._id || schedule.busId,
                    bus: schedule.busId || null,
                    driverId: schedule.driverId?._id || schedule.driverId,
                    driver: schedule.driverId || null,
                    startTime: schedule.startTime,
                    endTime: schedule.endTime,
                    arrivalTime: stopArrival.arrivalTime,
                    stopName: routeStop.stopName,
                    stopSequence: stopArrival.stopSequence
                };
            })
            .filter(Boolean)
            .sort((a, b) => {
                const dayA = dayOrder[a.dayOfWeek] || 99;
                const dayB = dayOrder[b.dayOfWeek] || 99;
                if (dayA !== dayB) {
                    return dayA - dayB;
                }

                const timeA = timeToMinutes(a.arrivalTime) || 0;
                const timeB = timeToMinutes(b.arrivalTime) || 0;
                return timeA - timeB;
            });

        return res.status(200).json({
            routeId: route._id,
            routeName: route.routeName,
            stop: {
                stopName: routeStop.stopName,
                sequence: routeStop.sequence,
                latitude: routeStop.latitude,
                longitude: routeStop.longitude
            },
            arrivals
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
};

module.exports = {
    createRoute,
    getAllRoutes,
    getRouteById,
    updateRoute,
    deleteRoute,
    getRouteSchedules,
    getRouteStopArrivals,
    addSchedule,
    updateSchedule,
    deleteSchedule
};