const express = require("express");
const router = express.Router();

const userRoutes = require("./user.routes");
const adminRoutes = require("./admin.routes");
const authRoutes = require("./auth.routes");
const driverRoutes = require("./driver.routes");
const passengerRoutes = require("./passenger.routes");
const busRoutes = require("./bus.routes");
const routeRoutes = require("./route.routes");
const tripRoutes = require("./trip.routes");
const notificationRoutes = require("./notification.routes");
const sosRoutes = require("./sos.routes");
const adminSosRoutes = require("./admin.sos.routes");
const faqRoutes = require("./faq.routes");


router.use("/admin", adminRoutes); // will handle /api/admin

router.use("/users", userRoutes); // will handle /api/users
router.use("/auth", authRoutes); // will handle /api/auth
router.use("/driver", driverRoutes); // will handle /api/driver
router.use("/passenger", passengerRoutes); // will handle /api/passenger
router.use("/bus", busRoutes); // will handle /api/bus
router.use("/routes", routeRoutes); // will handle /api/routes
router.use("/trips", tripRoutes); // will handle /api/trips
router.use("/notifications", notificationRoutes); // will handle /api/notifications
router.use('/sos', sosRoutes); // will handle /api/sos
router.use('/admin/sos', adminSosRoutes); // admin SOS endpoints
router.use('/faq', faqRoutes); // will handle /api/faq



module.exports = router;
