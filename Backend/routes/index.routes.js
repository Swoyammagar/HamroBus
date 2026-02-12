const express = require("express");
const router = express.Router();

const userRoutes = require("./user.routes");
const adminRoutes = require("./admin.routes");
const authRoutes = require("./auth.routes");
const driverRoutes = require("./driver.routes");
const passengerRoutes = require("./passenger.routes");
const busRoutes = require("./bus.routes");
const routeRoutes = require("./route.routes");

router.use("/admin", adminRoutes); // will handle /api/admin

router.use("/users", userRoutes); // will handle /api/users
router.use("/auth", authRoutes); // will handle /api/auth
router.use("/driver", driverRoutes); // will handle /api/driver
router.use("/passenger", passengerRoutes); // will handle /api/passenger
router.use("/bus", busRoutes); // will handle /api/bus
router.use("/routes", routeRoutes); // will handle /api/routes


module.exports = router;
