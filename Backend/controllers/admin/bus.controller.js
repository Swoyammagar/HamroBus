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
            assignedDriverId,
            registrationDate: new Date(),
            assignedRouteId
        });
        await newBus.save();
        return res.status(201).json({ message: "Bus created successfully", bus: newBus });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
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
        if (assignedDriverId) bus.assignedDriverId = assignedDriverId;
        if (assignedRouteId) bus.assignedRouteId = assignedRouteId;
        if (status) bus.status = status;
        if (crowdLevel) bus.crowdLevel = crowdLevel;
        if (currentPassengers !== undefined) bus.currentPassengers = currentPassengers;
        await bus.save();
        return res.status(200).json({ message: "Bus updated successfully", bus });
    }
    catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
}

const getAllBuses = async (req, res) => {
    try {
        const buses = await Bus.find()
            .populate({
                path: 'assignedDriverId',
                select: 'userId licenseNo',
                populate: { path: 'userId', select: 'firstName lastName' }
            })
            .populate('assignedRouteId', 'routeName routeNumber');
        return res.status(200).json({ buses });
    } catch (error) {
        return res.status(500).json({ message: "Server error", error });
    }
}

module.exports = {
    createBus,
    deleteBus,
    updateBus,
    getAllBuses
};