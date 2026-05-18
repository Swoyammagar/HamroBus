const express = require("express");
const router = express.Router();
const { Login, requestPasswordReset, resetPassword, verifyOTPUser, changeAdminPassword } = require("../controllers/admin.controller");
const { authenticateAdmin } = require("../middlewares/admin.auth.middleware"); // ✅ Updated import
const { currentUser } = require("../controllers/decodedTokenAdmin.controller");
const { getAdminReviews, getAdminReviewSummary, getDriverLeaderboard } = require("../controllers/admin/review.controller");

// Admin review routes
router.get("/reviews", authenticateAdmin, getAdminReviews);
router.get("/reviews/summary", authenticateAdmin, getAdminReviewSummary);
router.get("/reviews/leaderboard", authenticateAdmin, getDriverLeaderboard);
// Public routes
router.post("/login", Login);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/verify-otp", verifyOTPUser);

// Protected admin routes
router.get("/current", authenticateAdmin, currentUser); // ✅ Now properly validates admin role
router.post("/change-password", authenticateAdmin, changeAdminPassword);

module.exports = router;