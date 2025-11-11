const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
    email:{
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required: true
    },
    longitude: {
        type: Number,
    },
    latitude: {
        type: Number,
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
    ,
    refreshToken: {
        type: String,
        default: null,
    }
});
module.exports = mongoose.models.User || mongoose.model("User", userSchema);