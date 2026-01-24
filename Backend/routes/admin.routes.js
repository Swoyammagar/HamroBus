const express = require("express");
const router = express.Router();
const { Login, requestPasswordReset, resetPassword, verifyOTPUser } = require("../controllers/admin.controller");
const { authenticateAdmin } = require("../middlewares/admin.auth.middleware"); // ✅ Updated import
const { currentUser } = require("../controllers/decodedTokenAdmin.controller");

// Public routes
router.post("/login", Login);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/verify-otp", verifyOTPUser);

// Protected admin routes
router.get("/current", authenticateAdmin, currentUser); // ✅ Now properly validates admin role

module.exports = router;