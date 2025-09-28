const mongoose = require("mongoose");
const adminSchema = new mongoose.Schema({
    fullname:{
        type: String,
        default: 'Administrator'       
    },
    email:{
        type: String,
        required: true,
    },
    password:{
        type: String,
    }, 
    confirmPassword:{
        type: String,
    },
    otp:{
        type: String,
    }, 
    role:{
        type: String,
        default: 'admin'
    },
    default:{}
});
module.exports = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
