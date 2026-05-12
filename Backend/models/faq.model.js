const mongoose = require("mongoose");

const faqSchema = new mongoose.Schema({
    faqId: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
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
    role: {
        type: String,
        enum: ['driver', 'passenger'],
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('FAQ', faqSchema);
