const mongoose = require("mongoose");

const busSchema = new mongoose.Schema({
    busNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    model: {
        type: String,
        required: true,
    },
    capacity: {
        type: Number,
        required: true,
        min: 15,
        max: 60
    },
    status: {
        type: String,
        default: 'active'
    },
    crowdLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'full'],
        default: 'low'
    },
    currentPassengers: {
        type: Number,
        default: 0,
        min: 0
    },
    // Last known geo-location of the bus (kept up-to-date by driver location pings)
    lastKnownLocation: {
        latitude: { type: Number, required: false },
        longitude: { type: Number, required: false },
        heading: { type: Number, required: false },
        speed: { type: Number, required: false },
        timestamp: { type: Date, required: false }
    },
    // SOS state / emergency marker for the bus
    sosActive: {
        type: Boolean,
        default: false
    },
    sosCategory: {
        type: String,
        required: false
    },
    sosTimestamp: {
        type: Date,
        required: false
    },
    assignedDriverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: false
    },
    assignedRouteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route',
        required: false
    },
    registrationDate: {
        type: Date,
        required: true
    },
}, {
    timestamps: true
});

module.exports = mongoose.models.Bus || mongoose.model("Bus", busSchema);
