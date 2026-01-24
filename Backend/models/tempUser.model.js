const mongoose = require("mongoose");

/**
 * TempUser Model for OTP verification ONLY
 * This prevents verified users from being deleted during incomplete registration
 */
const tempUserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    otp: {
        type: String,
        required: true
    },
    otpExpiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 } // TTL index - auto-deletes after expiry
    },
    role: {
        type: String,
        enum: ['driver', 'passenger'],
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.TempUser || mongoose.model("TempUser", tempUserSchema);
