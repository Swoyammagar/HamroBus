const express = require("express");
const router = express.Router();
const { createUser, getAllUsers, LoginUser, getUserLocation, updateUserLocation } = require("../controllers/user.controller");

// POST /api/users
router.post("/create", createUser);

// GET /api/users
router.get("/getAll", getAllUsers);

router.post("/login", LoginUser);

router.put("/updateLocation/:id", updateUserLocation);
router.get("/getLocation/:id", getUserLocation);

module.exports = router;
