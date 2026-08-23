const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  sendEmailVerification,
  verifyEmail,
  updatePrivacySettings,
} = require("../controllers/authController");

const { protect } = require("../middleware/auth");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Too many login/signup attempts. Please try again after 15 minutes.",
  },
});

const verificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Too many verification attempts. Please try again later.",
  },
});

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);

router.post(
  "/forgot-password",
  authLimiter,
  forgotPassword
);

router.post(
  "/reset-password",
  authLimiter,
  resetPassword
);

router.get("/me", protect, getMe);

// Email verification
router.post(
  "/verify/email/send",
  protect,
  verificationLimiter,
  sendEmailVerification
);

router.post(
  "/verify/email",
  protect,
  verificationLimiter,
  verifyEmail
);

// Contact privacy settings
router.put(
  "/privacy",
  protect,
  updatePrivacySettings
);

module.exports = router;