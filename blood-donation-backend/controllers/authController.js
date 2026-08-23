const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const DonorProfile = require("../models/DonorProfile");
const EMAILJS_API_URL =
  "https://api.emailjs.com/api/v1.0/email/send";

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

// Safe user object returned to the frontend.
const getSafeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone || "",
  role: user.role,

  // Verification status
  emailVerified: user.emailVerified,
  phoneVerified: user.phoneVerified,

  // Email verification lock status
  emailVerificationAttempts:
    user.emailVerificationAttempts || 0,

  emailVerificationLockedUntil:
    user.emailVerificationLockedUntil || null,

  // Contact privacy settings
  showPhone: user.showPhone,
  showEmail: user.showEmail,
});

// Generate a secure 6-digit verification code.
const generateVerificationCode = () => {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
};

// Hash verification codes before storing them.
const hashVerificationCode = (code) => {
  return crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");
};

// Generate a secure password reset token.
const generatePasswordResetToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Password reset token validity: 10 minutes.
const getPasswordResetExpiry = () => {
  return new Date(Date.now() + 10 * 60 * 1000);
};

// Verification code validity: 10 minutes.
const getVerificationExpiry = () => {
  return new Date(
    Date.now() + 10 * 60 * 1000
  );
};

// Send email through EmailJS.
const sendVerificationEmail = async (
  email,
  name,
  code
) => {
  if (
    !process.env.EMAILJS_SERVICE_ID ||
    !process.env.EMAILJS_TEMPLATE_ID ||
    !process.env.EMAILJS_PUBLIC_KEY
  ) {
    throw new Error(
      "EmailJS is not configured. Check EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID and EMAILJS_PUBLIC_KEY in .env"
    );
  }

  const response = await fetch(
    EMAILJS_API_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service_id:
          process.env.EMAILJS_SERVICE_ID,

        template_id:
          process.env.EMAILJS_TEMPLATE_ID,

        user_id: 
          process.env.EMAILJS_PUBLIC_KEY,
        
        accessToken: 
          process.env.EMAILJS_PRIVATE_KEY,

        template_params: {
          name: name || "there",
          code,
          to_email: email,
     },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `EmailJS service failed: ${errorText}`
    );
  }
};

// Send password reset email through EmailJS.
const sendPasswordResetEmail = async (
  email,
  name,
  resetUrl
) => {
  if (
    !process.env.EMAILJS_SERVICE_ID ||
    !process.env.EMAILJS_RESET_TEMPLATE_ID ||
    !process.env.EMAILJS_PUBLIC_KEY
  ) {
    throw new Error(
      "Password reset email is not configured. Check EMAILJS_SERVICE_ID, EMAILJS_RESET_TEMPLATE_ID and EMAILJS_PUBLIC_KEY in .env"
    );
  }

  const response = await fetch(
    EMAILJS_API_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        service_id:
          process.env.EMAILJS_SERVICE_ID,

        template_id:
          process.env.EMAILJS_RESET_TEMPLATE_ID,

        user_id:
          process.env.EMAILJS_PUBLIC_KEY,

        accessToken:
          process.env.EMAILJS_PRIVATE_KEY,

        template_params: {
          name: name || "there",
          reset_url: resetUrl,
          to_email: email,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `EmailJS password reset failed: ${errorText}`
    );
  }
};

// ---------------------------------------------------------
// SIGNUP
// ---------------------------------------------------------

// @route POST /api/auth/signup
const signup = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      role,
      bloodGroup,
      city,
      pincode,
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message:
          "Name, email and password are required",
      });
    }

    const existingUser = await User.findOne({
      email,
    });

    if (existingUser) {
      return res.status(409).json({
        message:
          "An account with this email already exists",
      });
    }

    const user = await User.create({
      name,
      email,
      password,
      phone: phone || "",
      role: role || "donor",

      // Every newly created account starts
      // with an unverified email.
      emailVerified: false,

      // Phone verification is not implemented yet.
      // V2 temporarily treats phone as verified.
      phoneVerified: true,

      // Contact information is hidden by default.
      showPhone: false,
      showEmail: false,
    });

    // Create donor profile during donor signup.
    if (
      user.role === "donor" &&
      bloodGroup &&
      city
    ) {
      await DonorProfile.create({
        user: user._id,
        bloodGroup,
        city,
        pincode,
      });
    }

    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: getSafeUser(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Signup failed",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// LOGIN
// ---------------------------------------------------------

// @route POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Email and password are required",
      });
    }

    const user = await User.findOne({
      email,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const isMatch =
      await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      token,
      user: getSafeUser(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// FORGOT PASSWORD
// ---------------------------------------------------------

// @route POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    }).select(
      "+passwordResetTokenHash +passwordResetExpires"
    );

    // Do not reveal whether an account exists.
    if (!user) {
      return res.status(200).json({
        message:
          "If an account with that email exists, a password reset link has been sent.",
      });
    }

    const resetToken =
      generatePasswordResetToken();

    user.passwordResetTokenHash =
      hashVerificationCode(resetToken);

    user.passwordResetExpires =
      getPasswordResetExpiry();

    await user.save();

    const clientUrl =
      process.env.CLIENT_URL;

    if (!clientUrl) {
      user.passwordResetTokenHash = null;
      user.passwordResetExpires = null;

      await user.save();

      throw new Error(
        "CLIENT_URL is not configured in .env"
      );
    }

    const resetUrl =
      `${clientUrl}/reset-password/${resetToken}`;

    try {
      await sendPasswordResetEmail(
        user.email,
        user.name,
        resetUrl
      );
    } catch (emailError) {
      // Invalidate the token if email delivery fails.
      user.passwordResetTokenHash = null;
      user.passwordResetExpires = null;

      await user.save();

      throw emailError;
    }

    return res.status(200).json({
      message:
        "If an account with that email exists, a password reset link has been sent.",
    });
  } catch (error) {
    console.error(
      "Forgot password error:",
      error
    );

    return res.status(500).json({
      message:
        "Unable to process password reset request",
    });
  }
};

// ---------------------------------------------------------
// RESET PASSWORD
// ---------------------------------------------------------

// @route POST /api/auth/reset-password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        message: "Reset token and new password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    const tokenHash = hashVerificationCode(token);

    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: {
        $gt: new Date(),
      },
    }).select(
      "+password +passwordResetTokenHash +passwordResetExpires"
    );

    if (!user) {
      return res.status(400).json({
        message:
          "Password reset token is invalid or has expired",
      });
    }

    // Set the new password.
    // The User pre-save middleware will hash it.
    user.password = password;

    // Invalidate the reset token immediately.
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;

    await user.save();

    return res.status(200).json({
      message:
        "Password reset successfully. You can now log in with your new password.",
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    return res.status(500).json({
      message: "Unable to reset password",
    });
  }
};

// ---------------------------------------------------------
// CURRENT USER
// ---------------------------------------------------------

// @route GET /api/auth/me
const getMe = async (req, res) => {
  res.status(200).json({
    user: getSafeUser(req.user),
  });
};

// ---------------------------------------------------------
// EMAIL VERIFICATION
// ---------------------------------------------------------

// @route POST /api/auth/verify/email/send
const sendEmailVerification = async (
  req,
  res
) => {
  try {
    const user = await User.findById(
      req.user._id
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        message: "Email is already verified",
      });
    }

    // Check whether email verification is currently locked
    if (
      user.emailVerificationLockedUntil &&
      user.emailVerificationLockedUntil > new Date()
    ) {
      return res.status(429).json({
        message:
          "Email verification is locked for 24 hours because of too many incorrect attempts.",
        lockedUntil:
          user.emailVerificationLockedUntil,
      });
    }

    // If the previous lock has expired, reset the attempt counter.
    if (
      user.emailVerificationLockedUntil &&
      user.emailVerificationLockedUntil <= new Date()
    ) {
      user.emailVerificationAttempts = 0;
      user.emailVerificationLockedUntil = null;
    }

    const code = generateVerificationCode();

    user.emailVerificationTokenHash =
      hashVerificationCode(code);

    user.emailVerificationExpires =
      getVerificationExpiry();

    await user.save();

    try {
      await sendVerificationEmail(
        user.email,
        user.name,
        code
      );
    } catch (emailError) {
      // Remove the code if email delivery fails.
      user.emailVerificationTokenHash = null;
      user.emailVerificationExpires = null;

      await user.save();

      throw emailError;
    }

    res.status(200).json({
      message:
        "Verification code sent to your email",
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to send email verification code",
      error: error.message,
    });
  }
};

// @route POST /api/auth/verify/email
const verifyEmail = async (req, res) => {
  try {
    const { code } = req.body;

    if (
      !code ||
      !/^\d{6}$/.test(code)
    ) {
      return res.status(400).json({
        message:
          "A valid 6-digit verification code is required",
      });
    }

    const user = await User.findById(
      req.user._id
    ).select(
      "+emailVerificationTokenHash " +
        "+emailVerificationExpires " +
        "+emailVerificationAttempts " +
        "+emailVerificationLockedUntil"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check whether verification is currently locked
    if (
      user.emailVerificationLockedUntil &&
      user.emailVerificationLockedUntil > new Date()
    ) {
      return res.status(429).json({
        message:
          "Email verification is locked for 24 hours because of too many incorrect attempts.",
        lockedUntil:
          user.emailVerificationLockedUntil,
      });
    }

    // If the previous lock has expired, reset it
    if (
      user.emailVerificationLockedUntil &&
      user.emailVerificationLockedUntil <= new Date()
    ) {
      user.emailVerificationAttempts = 0;
      user.emailVerificationLockedUntil = null;

      await user.save();
    }

    if (user.emailVerified) {
      return res.status(400).json({
        message: "Email is already verified",
      });
    }

    if (
      !user.emailVerificationTokenHash ||
      !user.emailVerificationExpires
    ) {
      return res.status(400).json({
        message:
          "No active email verification code. Please request a new one",
      });
    }

    if (
      user.emailVerificationExpires <
      new Date()
    ) {
      user.emailVerificationTokenHash = null;
      user.emailVerificationExpires = null;

      await user.save();

      return res.status(400).json({
        message:
          "Verification code has expired. Please request a new one",
      });
    }

    const suppliedHash =
      hashVerificationCode(code);

    if (
      suppliedHash !==
      user.emailVerificationTokenHash
    ) {
      user.emailVerificationAttempts += 1;

      // Third incorrect attempt → 24-hour lock
      if (user.emailVerificationAttempts >= 3) {
        user.emailVerificationLockedUntil =
          new Date(
            Date.now() + 24 * 60 * 60 * 1000
          );

        // Invalidate the current OTP
        user.emailVerificationTokenHash = null;
        user.emailVerificationExpires = null;

        await user.save();

        return res.status(429).json({
          message:
            "Too many incorrect attempts. Email verification is locked for 24 hours.",
          lockedUntil:
            user.emailVerificationLockedUntil,
        });
      }

      await user.save();

      const attemptsRemaining =
        3 - user.emailVerificationAttempts;

      return res.status(400).json({
        message: "Invalid verification code",
        attemptsRemaining,
      });
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpires = null;
    user.emailVerificationAttempts = 0;
    user.emailVerificationLockedUntil = null;

    await user.save();

    res.status(200).json({
      message:
        "Email verified successfully",
      user: getSafeUser(user),
    });
  } catch (error) {
    res.status(500).json({
      message: "Email verification failed",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// CONTACT PRIVACY
// ---------------------------------------------------------

// @route PUT /api/auth/privacy
//
// Allows the logged-in user to control whether their
// verified phone/email can be displayed to other
// authenticated users.
const updatePrivacySettings = async (
  req,
  res
) => {
  try {
    const {
      showPhone,
      showEmail,
    } = req.body;

    // Both settings must be boolean values.
    if (
      typeof showPhone !== "boolean" ||
      typeof showEmail !== "boolean"
    ) {
      return res.status(400).json({
        message:
          "showPhone and showEmail must be boolean values",
      });
    }

    const user = await User.findById(
      req.user._id
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    user.showPhone = showPhone;
    user.showEmail = showEmail;

    await user.save();

    res.status(200).json({
      message:
        "Privacy settings updated successfully",
      user: getSafeUser(user),
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to update privacy settings",
      error: error.message,
    });
  }
};

module.exports = {
  signup,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  sendEmailVerification,
  verifyEmail,
  updatePrivacySettings,
};