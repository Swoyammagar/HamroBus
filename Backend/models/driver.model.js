const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    driverId: {
        type: String,
        required: true,
        unique: true
    },
    licenseNo: {
        type: String,
        required: true,
        unique: true
    },
    licenseImgUrl: {
        type: String,
        required: false
    },
    assignedBus: {
        type: String,
        required: false
    },
    assignedRoute: {
        type: String,
        required: false
    },
    validationStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    isActive: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.models.Driver || mongoose.model("Driver", driverSchema);
