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
    startDelayMinutes: {
        type: Number,
        default: 0,
        min: 0,
        description: "How many minutes late the trip started compared to schedule"
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
        stopId: {
            type: String,
            trim: true
        },
        completionTime: Date,
        passengersBoarded: Number,
        passengersAlighted: Number
    }],
    currentStop: {
        type: String,
        trim: true,
        required: false
    },
    previousStop: {
        type: String,
        trim: true,
        required: false
    },
    notes: {
        type: String,
        required: false
    },
    occupancyHistory: [{
        timestamp: {
            type: Date,
            default: () => new Date()
        },
        stopName: {
            type: String,
            trim: true,
            required: true
        },
        stopSequence: {
            type: Number,
            required: false
        },
        passengersBoarded: {
            type: Number,
            default: 0
        },
        passengersAlighted: {
            type: Number,
            default: 0
        },
        currentOccupancy: {
            type: Number,
            required: true
        },
        eventType: {
            type: String,
            enum: ['boarding', 'alighting', 'manual-update'],
            default: 'manual-update'
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.models.TripSession || mongoose.model("TripSession", tripSessionSchema);
