const Bus = require("../../models/bus.model");
const Driver = require("../../models/driver.model");
const Route = require("../../models/route.model");

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
        
        // If driver is assigned, check if they're already assigned to another bus
        if (assignedDriverId) {
            const driver = await Driver.findById(assignedDriverId);
            if (!driver) {
                return res.status(404).json({ message: "Driver not found" });
            }
            if (driver.assignedBus) {
                return res.status(400).json({ message: "Driver is already assigned to another bus" });
            }
        }

        // If route is assigned, verify it exists
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
        
        // Update driver's assignedBus field if driver is assigned
        if (assignedDriverId) {
            await Driver.findByIdAndUpdate(assignedDriverId, {
                assignedBus: newBus._id
            });
        }

        // Add bus to route's assignedBusIds if route is assigned
        if (assignedRouteId) {
            const routeUpdate = { $addToSet: { assignedBusIds: newBus._id } };
            
            // Also add driver to route's assignedDriverIds if driver is assigned
            if (assignedDriverId) {
                routeUpdate.$addToSet.assignedDriverIds = assignedDriverId;
            }
            
            await Route.findByIdAndUpdate(assignedRouteId, routeUpdate);
        }
        
        // Build populate query dynamically to avoid null reference issues
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
        
        // Clear the assignedBus field from the driver if one is assigned
        if (bus.assignedDriverId) {
            await Driver.findByIdAndUpdate(bus.assignedDriverId, {
                assignedBus: null
            });
        }

        // Remove bus from route's assignedBusIds if assigned to a route
        if (bus.assignedRouteId) {
            const routeUpdate = { $pull: { assignedBusIds: busId } };
            
            // Also remove driver from route's assignedDriverIds if driver is assigned
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
        
        // Handle driver reassignment
        if (assignedDriverId !== undefined) {
            const oldDriverId = bus.assignedDriverId;
            const newDriverId = assignedDriverId || null;
            
            // If driver is changing
            if (String(oldDriverId) !== String(newDriverId)) {
                // Clear old driver's assignedBus
                if (oldDriverId) {
                    await Driver.findByIdAndUpdate(oldDriverId, {
                        assignedBus: null
                    });
                    
                    // Remove old driver from route's assignedDriverIds if bus has a route
                    if (bus.assignedRouteId) {
                        await Route.findByIdAndUpdate(bus.assignedRouteId, {
                            $pull: { assignedDriverIds: oldDriverId }
                        });
                    }
                }
                
                // Assign new driver
                if (newDriverId) {
                    const driver = await Driver.findById(newDriverId);
                    if (!driver) {
                        return res.status(404).json({ message: "Driver not found" });
                    }
                    // Check if new driver is already assigned to another bus
                    if (driver.assignedBus && String(driver.assignedBus) !== String(busId)) {
                        return res.status(400).json({ message: "Driver is already assigned to another bus" });
                    }
                    // Update new driver's assignedBus
                    await Driver.findByIdAndUpdate(newDriverId, {
                        assignedBus: busId
                    });
                    
                    // Add new driver to route's assignedDriverIds if bus has a route
                    if (bus.assignedRouteId) {
                        await Route.findByIdAndUpdate(bus.assignedRouteId, {
                            $addToSet: { assignedDriverIds: newDriverId }
                        });
                    }
                }
                
                bus.assignedDriverId = newDriverId;
            }
        }

        // Handle route reassignment
        if (assignedRouteId !== undefined) {
            const oldRouteId = bus.assignedRouteId;
            const newRouteId = assignedRouteId || null;

            // If route is changing
            if (String(oldRouteId) !== String(newRouteId)) {
                // Remove bus from old route's assignedBusIds
                if (oldRouteId) {
                    const oldRouteUpdate = { $pull: { assignedBusIds: busId } };
                    
                    // Also remove driver from old route's assignedDriverIds if driver is assigned
                    if (bus.assignedDriverId) {
                        oldRouteUpdate.$pull.assignedDriverIds = bus.assignedDriverId;
                    }
                    
                    await Route.findByIdAndUpdate(oldRouteId, oldRouteUpdate);
                }

                // Add bus to new route's assignedBusIds
                if (newRouteId) {
                    const route = await Route.findById(newRouteId);
                    if (!route) {
                        return res.status(404).json({ message: "Route not found" });
                    }
                    
                    const newRouteUpdate = { $addToSet: { assignedBusIds: busId } };
                    
                    // Also add driver to new route's assignedDriverIds if driver is assigned
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
        
        // Build populate query dynamically
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

module.exports = {
    createBus,
    deleteBus,
    updateBus,
    getAllBuses
};