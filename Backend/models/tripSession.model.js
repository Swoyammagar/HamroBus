const mongoose = require("mongoose");

const tripSessionSchema = new mongoose.Schema({
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    routeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route',
        required: true
    },
    busId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
        required: false
    },
    scheduleId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    status: {
        type: String,
        enum: ['scheduled', 'in-progress', 'on-break', 'completed', 'cancelled', 'missed'],
        default: 'scheduled'
    },
    startTime: {
        type: Date,
        required: false
    },
    endTime: {
        type: Date,
        required: false
    },
    breakHistory: [{
        breakStartTime: {
            type: Date,
            required: true
        },
        breakEndTime: {
            type: Date,
            required: false
        },
        duration: {
            type: Number,
            description: "Break duration in minutes"
        }
    }],
    totalBreakTime: {
        type: Number,
        default: 0,
        description: "Total break time in minutes"
    },
    passengerCount: {
        type: Number,
        default: 0
    },
    completedStops: [{
        // Route stops do not have ObjectIds; track by stop name.
        stopId: {
            type: String,
            trim: true
        },
        completionTime: Date,
        passengersBoarded: Number,
        passengersAlighted: Number
    }],
    currentStop: {
        // Store current stop name to match route stop structure.
        type: String,
        trim: true,
        required: false
    },
    notes: {
        type: String,
        required: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.TripSession || mongoose.model("TripSession", tripSessionSchema);
