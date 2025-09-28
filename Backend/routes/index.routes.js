const express = require("express");
const router = express.Router();

const userRoutes = require("./user.routes");
const adminRoutes = require("./admin.routes");

router.use("/admin", adminRoutes); // will handle /api/admin

router.use("/users", userRoutes); // will handle /api/users


module.exports = router;
