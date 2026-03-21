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
        default: 'admin',
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
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending'
    },
    readBy: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'readBy.userType'
        },
        userType: {
            type: String,
            enum: ['Driver', 'Passenger'],
            required: true
        },
        readAt: {
            type: Date,
            default: Date.now
        }
    }],
    type: {
        type: String,
        enum: ['alert', 'info', 'maintenance', 'announcement', 'emergency'],
        default: 'info',
        required: true
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    expiresAt: {
        type: Date,
        required: false
    }
}, {
    timestamps: true
});

// Index for frequently queried fields
notificationSchema.index({ targetAudience: 1, createdAt: -1 });
notificationSchema.index({ 'readBy.userId': 1 });
notificationSchema.index({ status: 1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days
notificationSchema.index({ sentBy: 1, createdAt: -1 });

module.exports = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
