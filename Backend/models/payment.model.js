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

const paymentSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      index: true,
    },
    bookingCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    passengerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Passenger',
      required: true,
      index: true,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: false,
      index: true,
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: true,
      index: true,
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
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
      default: [],
    },
    seatCount: {
      type: Number,
      required: true,
      min: 1,
    },
    farePerSeat: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalFare: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    finalFare: {
      type: Number,
      default: 0,
      min: 0,
    },
    currency: {
      type: String,
      default: 'NPR',
      trim: true,
      uppercase: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
      description: 'Final amount charged to the passenger in the base currency units',
    },
    providerAmount: {
      type: Number,
      required: true,
      min: 0,
      description: 'Amount sent to the payment provider in minor units',
    },
    provider: {
      type: String,
      enum: ['khalti'],
      default: 'khalti',
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled', 'expired', 'refunded'],
      default: 'pending',
      index: true,
    },
    attemptNumber: {
      type: Number,
      default: 1,
      min: 1,
      index: true,
    },
    initiatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    completedAt: {
      type: Date,
    },
    failedAt: {
      type: Date,
    },
    cancelledAt: {
      type: Date,
    },
    paidAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
      index: true,
    },
    failureReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    khalti: {
      pidx: {
        type: String,
        trim: true,
        index: true,
      },
      transactionId: {
        type: String,
        trim: true,
        index: true,
      },
      purchaseOrderId: {
        type: String,
        trim: true,
      },
      purchaseOrderName: {
        type: String,
        trim: true,
      },
      paymentUrl: {
        type: String,
        trim: true,
      },
      returnUrl: {
        type: String,
        trim: true,
      },
      lookupStatus: {
        type: String,
        trim: true,
      },
      rawInitiateResponse: {
        type: mongoose.Schema.Types.Mixed,
      },
      rawVerifyResponse: {
        type: mongoose.Schema.Types.Mixed,
      },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ passengerId: 1, createdAt: -1 });
paymentSchema.index({ driverId: 1, createdAt: -1 });
paymentSchema.index({ busId: 1, createdAt: -1 });
paymentSchema.index({ routeId: 1, createdAt: -1 });
paymentSchema.index({ tripSessionId: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ provider: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);