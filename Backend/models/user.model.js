const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: false
    },
    phoneNumber: {
        type: String,
        required: true,
        unique: true
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
        required: true
    },
    confirmPassword:{
        type: String,
    },
    otp:{
        type: String,
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
        required: true
    },
    refreshToken: {
        type: String,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);