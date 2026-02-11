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
    estimatedArrivalTime: {
        type: String,
        required: false
    },
    estimatedDepartureTime: {
        type: String,
        required: false
    }
}, { _id: false });

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
    routeId: {
        type: String,
        required: true,
        unique: true
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
    frequencyInterval: {
        type: Number,
        required: true,
        description: "Interval in minutes between buses"
    },
    fareInfo: {
        baseFare: {
            type: Number,
            required: false
        },
        farePerKilometer: {
            type: Number,
            required: false
        }
    },
    description: {
        type: String,
        required: false
    },
    announcements: {
        type: String,
        required: false,
        description: "Any special announcements for this route"
    },
    averageRating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    totalReviews: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Index for frequently queried fields
routeSchema.index({ routeNumber: 1 });
routeSchema.index({ 'stops.latitude': 1, 'stops.longitude': 1 });

module.exports = mongoose.models.Route || mongoose.model("Route", routeSchema);
