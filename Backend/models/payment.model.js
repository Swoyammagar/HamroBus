const mongoose = require('mongoose');

const paymentStopSchema = new mongoose.Schema(
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
    paymentType: {
      type: String,
      enum: ['booking', 'qr'],
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: false,
      default: null,
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
      default: null,
      index: true,
    },
    busId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bus',
      required: true,
      index: true,
    },
    tripSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TripSession',
      required: false,
      default: null,
      index: true,
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      required: true,
      index: true,
    },
    boardingStop: {
      type: paymentStopSchema,
      required: false,
    },
    destinationStop: {
      type: paymentStopSchema,
      required: false,
    },
    fare: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      enum: ['khalti'],
      default: 'khalti',
    },
    paymentStatus: {
      type: String,
      enum: ['paid', 'failed', 'pending'],
      required: true,
      default: 'paid',
      index: true,
    },
    khaltiPidx: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
    khaltiTransactionId: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
    purchaseOrderId: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
    paidAt: {
      type: Date,
      required: false,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
      default: undefined,
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index(
  { bookingId: 1, paymentType: 1 },
  {
    unique: true,
    partialFilterExpression: {
      bookingId: { $type: 'objectId' },
      paymentType: 'booking',
    },
  }
);

paymentSchema.index(
  { khaltiPidx: 1, paymentType: 1 },
  {
    unique: true,
    partialFilterExpression: {
      khaltiPidx: { $type: 'string' },
    },
  }
);

module.exports = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);
