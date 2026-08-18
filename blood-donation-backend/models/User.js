const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },

    // Kept for future phone verification.
    // Phone verification is not implemented in V2 yet.
    phone: {
      type: String,
      trim: true,
    },

    // Email verification
    emailVerified: {
      type: Boolean,
      default: false,
    },

    // Future phone verification
    phoneVerified: {
      type: Boolean,
      default: true,
    },

    // Contact privacy settings
    // Users explicitly control whether their verified
    // contact information can be shown to other
    // authenticated users.
    showPhone: {
      type: Boolean,
      default: false,
    },

    showEmail: {
      type: Boolean,
      default: false,
    },

    emailVerificationTokenHash: {
      type: String,
      default: null,
      select: false,
    },

    emailVerificationExpires: {
      type: Date,
      default: null,
      select: false,
    },

    emailVerificationAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    emailVerificationLockedUntil: {
     type: Date,
      default: null,
      select: false,
    },

    // "recipient" is no longer a separate role.
    role: {
      type: String,
      enum: ["donor", "hospital", "admin"],
      default: "donor",
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (
  candidatePassword
) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);