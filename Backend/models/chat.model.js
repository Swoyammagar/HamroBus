const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema(
  {
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    status: {
      type: String,
      enum: ['open', 'in-progress', 'resolved'],
      default: 'open',
    },
    subject: {
      type: String,
      default: 'Help Request',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    readBy: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        userType: {
          type: String,
          enum: ['driver', 'admin'],
        },
        readAt: Date,
      },
    ],
  },
  { timestamps: true }
);

// Index for faster queries
chatSchema.index({ driverId: 1, createdAt: -1 });
chatSchema.index({ adminId: 1, status: 1 });
chatSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);
