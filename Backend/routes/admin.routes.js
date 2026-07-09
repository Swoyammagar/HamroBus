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
const { getAdminReviews, getAdminReviewSummary, getDriverLeaderboard, deleteReviewById } = require("../controllers/admin/review.controller");
const { getAdminPaymentListing, getAdminPaymentStatistics, getPaymentById } = require('../controllers/payment.comtroller');

router.get("/reviews", authenticateAdmin, getAdminReviews);
router.get("/reviews/summary", authenticateAdmin, getAdminReviewSummary);
router.get("/reviews/leaderboard", authenticateAdmin, getDriverLeaderboard);
router.delete("/reviews/:id", authenticateAdmin, deleteReviewById);
router.post("/login", Login);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/verify-otp", verifyOTPUser);

router.get("/current", authenticateAdmin, currentUser);
router.post("/change-password", authenticateAdmin, changeAdminPassword);
router.patch("/profile", authenticateAdmin, updateAdminProfile);
router.get("/dashboard", authenticateAdmin, getDashboardData);


router.get("/passengers", authenticateAdmin, getPassengersList);
router.get("/passengers/:passengerId", authenticateAdmin, getPassengerInfo);
router.delete("/passengers/:passengerId", authenticateAdmin, deletePassengerByAdmin);

router.get("/drivers", authenticateAdmin, getDriversList);
router.get("/drivers/:driverId", authenticateAdmin, getDriverInfo);
router.delete("/drivers/:driverId", authenticateAdmin, deleteDriverByAdmin);

router.get('/payments', authenticateAdmin, getAdminPaymentListing);
router.get('/payments/stats', authenticateAdmin, getAdminPaymentStatistics);
router.get('/payments/:paymentId', authenticateAdmin, getPaymentById);

module.exports = router;
