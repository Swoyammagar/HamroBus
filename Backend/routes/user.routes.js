const express = require("express");
const router = express.Router();
const { requestPasswordReset, resetPassword, verifyOTPUser } = require("../controllers/user.controller");

router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/verify-otp", verifyOTPUser);

module.exports = router;
