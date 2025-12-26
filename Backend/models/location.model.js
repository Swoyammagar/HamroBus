const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: true
    },
    tripId: {
        type: String,
        required: false
    },
    longitude: {
        type: Number,
        required: true
    },
    latitude: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Index for efficient queries
locationSchema.index({ driverId: 1, timestamp: -1 });

module.exports = mongoose.models.Location || mongoose.model("Location", locationSchema);
