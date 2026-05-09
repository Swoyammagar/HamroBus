const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
    fullname: {
        type: String,
        default: 'Administrator'       
    },
    email: {
        type: String,
        required: true,
        unique: true // ✅ Add unique constraint
    },
    password: {
        type: String,
        required: true // ✅ Make required
    }, 
    confirmPassword: {
        type: String,
    },
    otp: {
        type: String,
    }, 
    role: {
        type: String,
        default: 'admin'
    },
    permissions: {
        type: [String],
        default: [] // ✅ Add permissions array for future RBAC
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    refreshToken: {
        type: String,
        default: null,
    },
    phone: {
        type: String,
        default: null
    },
    
    // Messaging System
    hasUnreadMessages: {
        type: Boolean,
        default: false
    },
    unreadMessageCount: {
        type: Number,
        default: 0,
        min: 0
    },
    assignedChats: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Chat'
        }
    ]
}, {
    timestamps: true // ✅ Add timestamps
});

// ✅ Add index for faster email lookups
adminSchema.index({ email: 1 });

module.exports = mongoose.models.Admin || mongoose.model("Admin", adminSchema);