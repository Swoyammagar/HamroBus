const Bus = require("../../models/bus.model");
const Driver = require("../../models/driver.model");
const Route = require("../../models/route.model");
const TripSession = require("../../models/tripSession.model");

const createBus = async (req, res) => {
    const {
        busNumber,
        model,
        capacity,
        assignedDriverId,
        assignedRouteId,
    } = req.body;
    try {
        if (!busNumber || !model || !capacity) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const existingBus = await Bus.findOne({ busNumber });
        if (existingBus) {
            return res.status(400).json({ message: "Bus with this number already exists" });
        }

        if (assignedDriverId) {
            const driver = await Driver.findById(assignedDriverId);
            if (!driver) {
                return res.status(404).json({ message: "Driver not found" });
            }
            if (driver.assignedBus) {
                return res.status(400).json({ message: "Driver is already assigned to another bus" });
            }
        }

        if (assignedRouteId) {
            const route = await Route.findById(assignedRouteId);
            if (!route) {
                return res.status(404).json({ message: "Route not found" });
            }
        }

        const newBus = new Bus({
            busNumber,
            model,
            capacity,
            assignedDriverId: assignedDriverId || null,
            registrationDate: new Date(),
            assignedRouteId: assignedRouteId || null
        });
        await newBus.save();

        if (assignedDriverId) {
            await Driver.findByIdAndUpdate(assignedDriverId, {
                assignedBus: newBus._id
            });
        }

        if (assignedRouteId) {
            const routeUpdate = { $addToSet: { assignedBusIds: newBus._id } };

            if (assignedDriverId) {
                routeUpdate.$addToSet.assignedDriverIds = assignedDriverId;
            }

            await Route.findByIdAndUpdate(assignedRouteId, routeUpdate);
        }

        let query = Bus.findById(newBus._id);

        if (newBus.assignedDriverId) {
            query = query.populate({
                path: 'assignedDriverId',
                select: 'firstName lastName licenseNo'
            });
        }

        if (newBus.assignedRouteId) {
            query = query.populate('assignedRouteId', 'routeName');
        }

        const populatedBus = await query.exec();

        return res.status(201).json({ message: "Bus created successfully", bus: populatedBus });
    } catch (error) {
        console.error('Create bus error:', error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}

const deleteBus = async (req, res) => {
    const { busId } = req.params;
    try {
        const bus = await Bus.findById(busId);
        if (!bus) {
            return res.status(404).json({ message: "Bus not found" });
        }

        if (bus.assignedDriverId) {
            await Driver.findByIdAndUpdate(bus.assignedDriverId, {
                assignedBus: null
            });
        }

        if (bus.assignedRouteId) {
            const routeUpdate = { $pull: { assignedBusIds: busId } };

            if (bus.assignedDriverId) {
                routeUpdate.$pull.assignedDriverIds = bus.assignedDriverId;
            }

            await Route.findByIdAndUpdate(bus.assignedRouteId, routeUpdate);
        }

        await bus.deleteOne();
        return res.status(200).json({ message: "Bus deleted successfully" });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
}

const updateBus = async (req, res) => {
    const { busId } = req.params;
    const {
        busNumber,
        model,
        capacity,
        assignedDriverId,
        assignedRouteId,
        status,
        crowdLevel,
        currentPassengers
    } = req.body;
    try {
        const bus = await Bus.findById(busId);
        if (!bus) {
            return res.status(404).json({ message: "Bus not found" });
        }

        if (assignedDriverId !== undefined) {
            const oldDriverId = bus.assignedDriverId;
            const newDriverId = assignedDriverId || null;

            if (String(oldDriverId) !== String(newDriverId)) {
                if (oldDriverId) {
                    await Driver.findByIdAndUpdate(oldDriverId, {
                        assignedBus: null
                    });

                    if (bus.assignedRouteId) {
                        await Route.findByIdAndUpdate(bus.assignedRouteId, {
                            $pull: { assignedDriverIds: oldDriverId }
                        });
                    }
                }

                if (newDriverId) {
                    const driver = await Driver.findById(newDriverId);
                    if (!driver) {
                        return res.status(404).json({ message: "Driver not found" });
                    }
                    if (driver.assignedBus && String(driver.assignedBus) !== String(busId)) {
                        return res.status(400).json({ message: "Driver is already assigned to another bus" });
                    }
                    await Driver.findByIdAndUpdate(newDriverId, {
                        assignedBus: busId
                    });

                    if (bus.assignedRouteId) {
                        await Route.findByIdAndUpdate(bus.assignedRouteId, {
                            $addToSet: { assignedDriverIds: newDriverId }
                        });
                    }
                }

                bus.assignedDriverId = newDriverId;
            }
        }

        if (assignedRouteId !== undefined) {
            const oldRouteId = bus.assignedRouteId;
            const newRouteId = assignedRouteId || null;

            if (String(oldRouteId) !== String(newRouteId)) {
                // Check if bus has an active ongoing trip
                const activeTrip = await TripSession.findOne({
                    busId: busId,
                    status: { $in: ['in-progress', 'on-break'] }
                });

                if (activeTrip) {
                    return res.status(400).json({
                        message: "Cannot change route: Bus has an active ongoing trip. Please wait until the trip is completed."
                    });
                }
                if (oldRouteId) {
                    const oldRouteUpdate = { $pull: { assignedBusIds: busId } };

                    if (bus.assignedDriverId) {
                        oldRouteUpdate.$pull.assignedDriverIds = bus.assignedDriverId;
                    }

                    await Route.findByIdAndUpdate(oldRouteId, oldRouteUpdate);
                }

                if (newRouteId) {
                    const route = await Route.findById(newRouteId);
                    if (!route) {
                        return res.status(404).json({ message: "Route not found" });
                    }

                    const newRouteUpdate = { $addToSet: { assignedBusIds: busId } };

                    if (bus.assignedDriverId) {
                        newRouteUpdate.$addToSet.assignedDriverIds = bus.assignedDriverId;
                    }

                    await Route.findByIdAndUpdate(newRouteId, newRouteUpdate);
                }

                bus.assignedRouteId = newRouteId;
            }
        }

        if (busNumber) bus.busNumber = busNumber;
        if (model) bus.model = model;
        if (capacity) bus.capacity = capacity;
        if (status) bus.status = status;
        if (crowdLevel) bus.crowdLevel = crowdLevel;
        if (currentPassengers !== undefined) bus.currentPassengers = currentPassengers;
        await bus.save();

        let query = Bus.findById(busId);

        if (bus.assignedDriverId) {
            query = query.populate({
                path: 'assignedDriverId',
                select: 'firstName lastName licenseNo'
            });
        }

        if (bus.assignedRouteId) {
            query = query.populate('assignedRouteId', 'routeName');
        }

        const updatedBus = await query.exec();

        const io = req.app.get('io');
        if (io && bus.assignedDriverId) {
            io.to(`driver:${bus.assignedDriverId}`).emit('route:updated', {
                message: 'Your assigned bus or route has been updated',
                busId: bus._id,
                routeId: bus.assignedRouteId,
                timestamp: new Date()
            });
        }

        return res.status(200).json({ message: "Bus updated successfully", bus: updatedBus });
    }
    catch (error) {
        console.error('Update bus error:', error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}

const getAllBuses = async (req, res) => {
    try {
        const buses = await Bus.find()
            .populate({
                path: 'assignedDriverId',
                select: 'firstName lastName licenseNo',
                options: { strictPopulate: false }
            })
            .populate({
                path: 'assignedRouteId',
                select: 'routeName',
                options: { strictPopulate: false }
            });
        return res.status(200).json({ buses });
    } catch (error) {
        console.error('Get all buses error:', error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
}

const getBusOccupancy = async (req, res) => {
    const { busId } = req.params;
    try {
        if (!busId) {
            return res.status(400).json({ message: "busId is required" });
        }

        const bus = await Bus.findById(busId).select('_id currentPassengers updatedAt').lean();
        if (!bus) {
            return res.status(404).json({ message: "Bus not found" });
        }

        return res.status(200).json({
            busId: String(bus._id),
            passengerCount: bus.currentPassengers || 0,
            lastUpdated: bus.updatedAt,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching bus occupancy:', error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

const getBusSosState = async (req, res) => {
    const { busId } = req.params;
    try {
        if (!busId) {
            return res.status(400).json({ message: "busId is required" });
        }

        const bus = await Bus.findById(busId).select('_id sosActive sosCategory sosTimestamp updatedAt').lean();
        if (!bus) {
            return res.status(404).json({ message: "Bus not found" });
        }

        return res.status(200).json({
            busId: String(bus._id),
            sosActive: bus.sosActive || false,
            sosCategory: bus.sosCategory || null,
            sosTimestamp: bus.sosTimestamp || null,
            lastUpdated: bus.updatedAt,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching bus SOS state:', error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};

module.exports = {
    createBus,
    deleteBus,
    updateBus,
    getAllBuses,
    getBusOccupancy,
    getBusSosState
};
