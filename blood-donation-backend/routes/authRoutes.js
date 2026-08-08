const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  signup,
  login,
  getMe,
  sendEmailVerification,
  verifyEmail,
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
    message: "Too many verification attempts. Please try again later.",
  },
});

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
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

module.exports = router;