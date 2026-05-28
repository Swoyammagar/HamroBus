const mongoose = require("mongoose");

const passengerSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true
    },
    address: {
        type: String,
        required: false
    },
    gender: {
        type: String,
        required: false
    },
    dob: {
        type: Date,
        required: false
    },
    profileImgUrl: {
        type: String,
        required: false
    },

    otp: {
        type: String,
        required: false
    },
    otpExpiresAt: {
        type: Date,
        required: false
    },
    refreshToken: {
        type: String,
        default: null
    },
    pushToken: {
        type: String,
        default: null,
        index: true
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    passwordResetVerified: {
        type: Boolean,
        default: false
    },

    rewardPoints: {
        type: Number,
        default: 0,
        min: 0
    },
    totalPointsEarned: {
        type: Number,
        default: 0,
        min: 0
    },
    totalPointsRedeemed: {
        type: Number,
        default: 0,
        min: 0
    },
    consecutiveCancellations: {
        type: Number,
        default: 0,
        min: 0
    },
    banUntil: {
        type: Date,
        required: false
    },
    pointsHistory: [{
        _id: false,
        tripId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TripSession',
            required: false
        },
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
            required: false
        },
        action: {
            type: String,
            enum: ['earned', 'deducted', 'redeemed'],
            required: true
        },
        points: {
            type: Number,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],

    deleteRequestedAt: {
        type: Date,
        required: false,
        index: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.Passenger || mongoose.model("Passenger", passengerSchema);
