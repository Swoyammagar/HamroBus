const express = require("express");
const router = express.Router();

const userRoutes = require("./user.routes");
const adminRoutes = require("./admin.routes");
const authRoutes = require("./auth.routes");

router.use("/admin", adminRoutes); // will handle /api/admin

router.use("/users", userRoutes); // will handle /api/users
router.use("/auth", authRoutes); // will handle /api/auth


module.exports = router;
