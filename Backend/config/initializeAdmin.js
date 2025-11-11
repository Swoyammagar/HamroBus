const Admin = require("../models/admin.model");
const bcrypt = require("bcrypt");
require("dotenv").config();

const initializeAdmin = async () => {
  try {
    const existing = await Admin.findOne({ email: process.env.ADMIN_EMAIL });

    if (!existing) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
      const newAdmin = new Admin({
        email: process.env.ADMIN_EMAIL,
        password: hashedPassword,
      });

      await newAdmin.save();
      console.log("✅ Admin created from .env on startup.");
    } else {
      console.log("ℹ️ Admin already exists, skipping creation.");
    }
  } catch (error) {
    console.error("❌ Error initializing admin:", error);
  }
};

module.exports = initializeAdmin;
