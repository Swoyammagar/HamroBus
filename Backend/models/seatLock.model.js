const mongoose = require('mongoose');

const seatLockSchema = new mongoose.Schema(
  {
    seatKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: true,
      index: true,
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: true,
      index: true,
    },
    scheduleId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    serviceDate: {
      type: Date,
      required: true,
      index: true,
    },
    seatNumber: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  }
);

seatLockSchema.index({ bookingId: 1, seatNumber: 1 });

module.exports = mongoose.models.SeatLock || mongoose.model('SeatLock', seatLockSchema);
