const express = require("express");
const rateLimit = require("express-rate-limit");
const { signup, login, getMe } = require("../controllers/authController");
const { protect } = require("../middleware/auth");

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // maximum 10 attempts per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many login/signup attempts. Please try again after 15 minutes.",
  },
});

router.post("/signup", authLimiter, signup);
router.post("/login", authLimiter, login);
router.get("/me", protect, getMe);

module.exports = router;