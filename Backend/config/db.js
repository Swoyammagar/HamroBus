require("dotenv").config();
const mongoose = require("mongoose");

const connectDB = async () => {
  try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1); // Exit process with failure
    }
}

const dropOldBusIndex = async () => {
    try {
        const Bus = require("../models/bus.model");
        await Bus.collection.dropIndex('busId_1');
    } catch (error) {
        if (error.message && error.message.includes('index not found')) {
        }
    }
};

module.exports = { connectDB, dropOldBusIndex };


