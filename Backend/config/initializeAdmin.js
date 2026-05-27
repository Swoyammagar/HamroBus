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
        phone: process.env.ADMIN_PHONE
      });

      await newAdmin.save();
    } else {
    }
  } catch (error) {
    console.error(" Error initializing admin:", error);
  }
};

module.exports = initializeAdmin;
