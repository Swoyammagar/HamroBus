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
        const { dayOfWeek, driverId, busId, startTime, endTime, notes } = req.body;

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

            route.schedules.push({ dayOfWeek, driverId, busId, startTime, endTime, notes });
            await route.save();

            return res.status(201).json({ message: "Schedule added successfully", schedules: route.schedules });
        } catch (error) {
            return res.status(500).json({ message: "Server error", error });
        }
    };

    const updateSchedule = async (req, res) => {
        const { routeId, scheduleId } = req.params;
        const { dayOfWeek, driverId, busId, startTime, endTime, notes } = req.body;

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

    module.exports = {
        createRoute,
        getAllRoutes,
        getRouteById,
        updateRoute,
        deleteRoute,
        getRouteSchedules,
        addSchedule,
        updateSchedule,
        deleteSchedule
    };