const mongoose = require('mongoose');

const SosSchema = new mongoose.Schema(
  {
    sosId: { type: String, required: true, unique: true },
    driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', required: true },
    busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'TripSession', default: null },
    category: { type: String, default: 'other' },
    details: { type: String, default: '' },
    location: {
      latitude: { type: Number },
      longitude: { type: Number },
    },
    status: { type: String, enum: ['active', 'cleared'], default: 'active' },
    createdAt: { type: Date, default: Date.now },
    clearedAt: { type: Date, default: null },
    clearedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
    senderSnapshot: {
      name: { type: String },
      profileImgUrl: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Sos', SosSchema);
