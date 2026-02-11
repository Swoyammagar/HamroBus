const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
    notificationId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    message: {
        type: String,
        required: true,
        trim: true
    },
    sentBy: {
        type: String,
        enum: ['admin', 'driver', 'system'],
        required: true
    },
    senderDetails: {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            required: false
        },
        senderName: {
            type: String,
            required: false
        }
    },
    targetAudience: {
        type: String,
        enum: ['all', 'drivers', 'passengers', 'admins', 'specific_route', 'specific_bus', 'specific_user'],
        required: true
    },
    targetRouteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route',
        required: false
    },
    targetBusId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Bus',
        required: false
    },
    targetUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    targetUserIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],

}, {
    timestamps: true
});

// Index for frequently queried fields
notificationSchema.index({ targetAudience: 1, createdAt: -1 });
notificationSchema.index({ 'readBy.userId': 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
