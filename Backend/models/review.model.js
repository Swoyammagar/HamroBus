const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
    reviewId: {
        type: String,
        required: true,
        unique: true
    },
    scheduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Schedule',
        required: true
    },
    passengerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Passenger',
        required: true
    },
    passengerName: {
        type: String,
        required: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        required: false
    },
    busId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
        required: false
    },
    routeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route',
        required: false
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        required: false,
        trim: true,
        maxlength: 500
    },
    tags: [{
        type: String,
        enum: ['polite', 'rash_driving', 'clean_bus', 'dirty_bus', 'on_time', 'delayed', 'helpful', 'safe_driving', 'good_condition', 'poor_condition']
    }],
    tripDate: {
        type: Date,
        required: true
    },
}, {
    timestamps: true
});

// Index for frequently queried fields
reviewSchema.index({ driverId: 1 });
reviewSchema.index({ busId: 1 });
reviewSchema.index({ routeId: 1 });
reviewSchema.index({ passengerId: 1 });
reviewSchema.index({ status: 1 });
reviewSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Review || mongoose.model("Review", reviewSchema);
