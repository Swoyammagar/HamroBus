const express = require("express");
const router = express.Router();

const userRoutes = require("./user.routes");


router.use("/users", userRoutes); // will handle /api/users

module.exports = router;
