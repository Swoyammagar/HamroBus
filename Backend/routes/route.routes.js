const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../middlewares/admin.auth.middleware");
const {
    createRoute,
    getAllRoutes,
    getRouteById,
    updateRoute,
    deleteRoute,
    getRouteSchedules,
    getRouteStopArrivals,
    addSchedule,
    updateSchedule,
    deleteSchedule
} = require("../controllers/admin/route.controller");

// Public read
router.get("/", getAllRoutes);
router.get("/:routeId", getRouteById);
router.get("/:routeId/schedules", getRouteSchedules);
router.get("/:routeId/stops/:stopName/arrivals", getRouteStopArrivals);

// Admin write
router.post("/", authenticateAdmin, createRoute);
router.put("/:routeId", authenticateAdmin, updateRoute);
router.delete("/:routeId", authenticateAdmin, deleteRoute);
router.post("/:routeId/schedules", authenticateAdmin, addSchedule);
router.put("/:routeId/schedules/:scheduleId", authenticateAdmin, updateSchedule);
router.delete("/:routeId/schedules/:scheduleId", authenticateAdmin, deleteSchedule);

module.exports = router;
