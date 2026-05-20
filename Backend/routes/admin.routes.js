const express = require("express");
const router = express.Router();
const { 
  Login, 
  requestPasswordReset, 
  resetPassword, 
  verifyOTPUser, 
  changeAdminPassword,
  updateAdminProfile,
  getDashboardData,
  getPassengersList,
  getPassengerInfo,
  deletePassengerByAdmin,
  getDriversList,
  getDriverInfo,
  deleteDriverByAdmin,
} = require("../controllers/admin.controller");
const { authenticateAdmin } = require("../middlewares/admin.auth.middleware");
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
router.get("/current", authenticateAdmin, currentUser);
router.post("/change-password", authenticateAdmin, changeAdminPassword);
router.patch("/profile", authenticateAdmin, updateAdminProfile);
router.get("/dashboard", authenticateAdmin, getDashboardData);

// ==================== USER MANAGEMENT ROUTES ====================

// Passenger Management Routes
router.get("/passengers", authenticateAdmin, getPassengersList);
router.get("/passengers/:passengerId", authenticateAdmin, getPassengerInfo);
router.delete("/passengers/:passengerId", authenticateAdmin, deletePassengerByAdmin);

// Driver Management Routes
router.get("/drivers", authenticateAdmin, getDriversList);
router.get("/drivers/:driverId", authenticateAdmin, getDriverInfo);
router.delete("/drivers/:driverId", authenticateAdmin, deleteDriverByAdmin);

module.exports = router;
