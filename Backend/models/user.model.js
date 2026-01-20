const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
    },
    lastName: {
        type: String,
    },
    address: {
        type: String,
    },
    phoneNumber: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    gender: {
        type: String,
        required: false
    },
    dob: {
        type: Date,
        required: false
    },
    password: {
        type: String,
    },
    confirmPassword:{
        type: String,
    },
    otp:{
        type: String,
    }, 
    otpExpiresAt: {
        type: Date,
        index: { expireAfterSeconds: 0 } // ✅ TTL index
    },
    profileImgUrl: {
        type: String,
        required: false
    },
    passwordResetVerified: {
        type: Boolean,
        default: false
    },
    isEmailVerified: {
        type: Boolean,
        default: false,
    },
    roles: {
        type: [String],
        default: [],
        enum: ['driver', 'passenger'],
        required: true,
    },
    refreshToken: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);