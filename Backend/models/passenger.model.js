const mongoose = require("mongoose");

const passengerSchema = new mongoose.Schema({
    // Personal Information
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
    
    // Authentication & Security
    otp: {
        type: String,
        required: false
    },
    otpExpiresAt: {
        type: Date,
        index: { expireAfterSeconds: 0 }
    },
    refreshToken: {
        type: String,
        default: null
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    passwordResetVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.Passenger || mongoose.model("Passenger", passengerSchema);
