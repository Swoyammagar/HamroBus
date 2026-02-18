const Bus = require("../../models/bus.model");

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
        const newBus = new Bus({
            busNumber,
            model,
            capacity,
            assignedDriverId: assignedDriverId || null,
            registrationDate: new Date(),
            assignedRouteId: assignedRouteId || null
        });
        await newBus.save();
        
        // Build populate query dynamically to avoid null reference issues
        let query = Bus.findById(newBus._id);
        
        if (newBus.assignedDriverId) {
            query = query.populate({
                path: 'assignedDriverId',
                select: 'firstName lastName licenseNo'
            });
        }
        
        if (newBus.assignedRouteId) {
            query = query.populate('assignedRouteId', 'routeName routeNumber');
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
        if (busNumber) bus.busNumber = busNumber;
        if (model) bus.model = model;
        if (capacity) bus.capacity = capacity;
        if (assignedDriverId !== undefined) bus.assignedDriverId = assignedDriverId || null;
        if (assignedRouteId !== undefined) bus.assignedRouteId = assignedRouteId || null;
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
            query = query.populate('assignedRouteId', 'routeName routeNumber');
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
                select: 'routeName routeNumber',
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