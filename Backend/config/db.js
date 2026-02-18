require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = async () => {
  try { 
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1); // Exit process with failure
    }   
}

// Drop old busId index after models are loaded
const dropOldBusIndex = async () => {
    try {
        const Bus = require("../models/bus.model");
        await Bus.collection.dropIndex('busId_1');
        console.log("✅ Dropped old busId index");
    } catch (error) {
        if (error.message && error.message.includes('index not found')) {
            console.log("ℹ️ No old busId index to drop");
        }
        // Ignore other errors
    }
};

module.exports = { connectDB, dropOldBusIndex }; 


