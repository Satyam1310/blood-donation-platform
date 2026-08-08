const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const DonorProfile = require("../models/DonorProfile");

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

// Verification code validity: 10 minutes.
const getVerificationExpiry = () => {
  return new Date(
    Date.now() + 10 * 60 * 1000
  );
};

// Send email through Resend.
const sendVerificationEmail = async (
  email,
  name,
  code
) => {
  if (
    !process.env.RESEND_API_KEY ||
    !process.env.EMAIL_FROM
  ) {
    throw new Error(
      "Email verification is not configured. Add RESEND_API_KEY and EMAIL_FROM to .env"
    );
  }

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [email],
        subject:
          "Verify your Blood Donation account",
        html: `
          <div>
            <h2>Verify your email</h2>

            <p>Hello ${name || "there"},</p>

            <p>
              Use the following code to verify your
              email address:
            </p>

            <div style="
              font-size: 32px;
              font-weight: bold;
              letter-spacing: 8px;
              padding: 18px;
              background: #f5f5f5;
              text-align: center;
              margin: 24px 0;
            ">
              ${code}
            </div>

            <p>This code expires in 10 minutes.</p>

            <p>
              If you did not request this verification,
              you can ignore this email.
            </p>
          </div>
        `,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Email service failed: ${errorText}`
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
      "+emailVerificationTokenHash +emailVerificationExpires"
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
      return res.status(400).json({
        message: "Invalid verification code",
      });
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpires = null;

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
  getMe,
  sendEmailVerification,
  verifyEmail,
  updatePrivacySettings,
};