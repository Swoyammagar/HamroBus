const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    fullname: {
        type: String,
        default: 'Administrator'
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
    confirmPassword: {
        type: String,
    },
    otp: {
        type: String,
    },
    role: {
        type: String,
        default: 'admin'
    },
    permissions: {
        type: [String],
        default: []
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    refreshToken: {
        type: String,
        default: null,
        select: false,
    },
    refreshTokens: {
        type: [{
            token: {
                type: String,
                required: true,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
            expiresAt: {
                type: Date,
                default: null,
            },
            deviceId: {
                type: String,
                default: null,
            },
        }],
        default: [],
        select: false,
    },
    phone: {
        type: String,
        default: null
    },

}, {
    timestamps: true
});


adminSchema.index({ email: 1 });
adminSchema.index({ 'refreshTokens.token': 1 });

module.exports = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
