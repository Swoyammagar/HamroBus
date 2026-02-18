const mongoose = require("mongoose");

const stopSchema = new mongoose.Schema({
    stopName: {
        type: String,
        required: true,
        trim: true
    },
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    sequence: {
        type: Number,
        required: true
    },
}, { _id: false });

const scheduleSchema = new mongoose.Schema({
    dayOfWeek: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    busId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
        required: true
    },
    startTime: {
        type: String,
        required: true,
        description: "Format: HH:MM (24-hour)"
    },
    endTime: {
        type: String,
        required: true,
        description: "Format: HH:MM (24-hour)"
    },
    notes: {
        type: String,
        required: false,
        trim: true
    }
}, { timestamps: true });

const routeSchema = new mongoose.Schema({
    routeNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    routeName: {
        type: String,
        required: true,
        trim: true
    },
    source: {
        type: String,
        required: true,
        trim: true
    },
    destination: {
        type: String,
        required: true,
        trim: true
    },
    distance: {
        type: Number,
        required: true,
        description: "Route distance in kilometers"
    },
    estimatedDuration: {
        type: Number,
        required: false,
        description: "Estimated journey time in minutes"
    },
    stops: [stopSchema],
    assignedBusIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus'
    }],
    assignedDriverIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver'
    }],
    operatingDays: [{
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true
    }],
    firstBusTiming: {
        type: String,
        required: true,
        description: "Format: HH:MM (24-hour)"
    },
    lastBusTiming: {
        type: String,
        required: true,
        description: "Format: HH:MM (24-hour)"
    },
    schedules: [scheduleSchema],
    fareInfo: {
        type: Number,
        required: true,
    },
}, {
    timestamps: true
});

// Index for frequently queried fields
routeSchema.index({ routeNumber: 1 });
routeSchema.index({ 'stops.latitude': 1, 'stops.longitude': 1 });

module.exports = mongoose.models.Route || mongoose.model("Route", routeSchema);
