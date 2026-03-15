const mongoose = require('mongoose');

const bookingStopSchema = new mongoose.Schema(
  {
    stopName: {
      type: String,
      required: true,
      trim: true,
    },
    sequence: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Passenger',
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
    tripSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TripSession',
      required: false,
      index: true,
    },
    serviceDate: {
      type: Date,
      required: true,
      index: true,
    },
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
    },
    scheduleStartTime: {
      type: String,
      required: true,
      trim: true,
    },
    scheduleEndTime: {
      type: String,
      required: true,
      trim: true,
    },
    boardingStop: {
      type: bookingStopSchema,
      required: true,
    },
    destinationStop: {
      type: bookingStopSchema,
      required: true,
    },
    seatNumbers: {
      type: [String],
      required: true,
      validate: {
        validator(value) {
          return Array.isArray(value) && value.length >= 1 && value.length <= 4;
        },
        message: 'seatNumbers must include between 1 and 4 seats',
      },
    },
    seatCount: {
      type: Number,
      required: true,
      min: 1,
      max: 4,
    },
    farePerSeat: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
    },
    totalFare: {
      type: Number,
      required: false,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['confirmed', 'cancelled', 'in-progress', 'completed'],
      default: 'confirmed',
      index: true,
    },
    cancelledAt: {
      type: Date,
      required: false,
    },
    cancellationReason: {
      type: String,
      required: false,
      trim: true,
      maxlength: 250,
    },
    startedAt: {
      type: Date,
      required: false,
    },
    completedAt: {
      type: Date,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({
  routeId: 1,
  busId: 1,
  scheduleId: 1,
  serviceDate: 1,
  status: 1,
});

bookingSchema.index({
  passengerId: 1,
  createdAt: -1,
});

module.exports = mongoose.models.Booking || mongoose.model('Booking', bookingSchema);
