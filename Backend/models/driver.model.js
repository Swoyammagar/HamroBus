const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
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
    
    // Driver-specific Information
    licenseNo: {
        type: String,
        required: true,
        unique: true
    },
    licenseImgUrl: {
        type: String,
        required: false
    },
    assignedBus: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
        required: false
    },
    assignedRoute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route',
        required: false
    },
    validationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    isActive: {
        type: Boolean,
        default: false
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
    },
    ratingAverage: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    ratingCount: {
        type: Number,
        default: 0,
        min: 0
    },
}, {
    timestamps: true
});

module.exports = mongoose.models.Driver || mongoose.model("Driver", driverSchema);
