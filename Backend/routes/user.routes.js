const express = require("express");
const router = express.Router();
const { requestPasswordReset, resetPassword, verifyOTPUser, requestSignupOTP, verifySignupOTP, phoneExists } = require("../controllers/user.controller");

router.post("/request-password-reset", requestPasswordReset);
router.post("/reset-password", resetPassword);
router.post("/verify-otp", verifyOTPUser);
router.post("/request-signup-otp", requestSignupOTP);  
router.post("/verify-signup-otp", verifySignupOTP);  
router.post("/phone-exists", phoneExists);

module.exports = router;
