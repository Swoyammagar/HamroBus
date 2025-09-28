const express = require("express");
const router = express.Router();
const { Login, requestPasswordReset, resetPassword, verifyOTPUser  } = require("../controllers/admin.controller");
const authenticateUser = require("../middlewares/auth.middleware");
const { currentUser } = require("../controllers/decodedTokenAdmin.controller");

router.post("/login", Login);
router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/verify-otp", verifyOTPUser);
router.get("/current", authenticateUser, currentUser);

module.exports = router;