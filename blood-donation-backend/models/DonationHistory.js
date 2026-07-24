const mongoose = require("mongoose");

const donationHistorySchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      trim: true,
    },
    hospital: {
      type: String,
      trim: true,
    },
    unitsGiven: {
      type: Number,
      default: 1,
      min: 1,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DonationHistory", donationHistorySchema);
