const mongoose = require("mongoose");

const donorProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    pincode: {
      type: String,
      trim: true,
      index: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastDonationDate: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index for common filter combos
donorProfileSchema.index({ bloodGroup: 1, city: 1, isAvailable: 1 });

// Virtual: eligibility check (90-day gap since last donation)
donorProfileSchema.virtual("isEligible").get(function () {
  if (!this.lastDonationDate) return true;
  const daysSinceLastDonation =
    (Date.now() - this.lastDonationDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceLastDonation >= 90;
});

donorProfileSchema.set("toJSON", { virtuals: true });
donorProfileSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("DonorProfile", donorProfileSchema);
