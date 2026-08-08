const mongoose = require("mongoose");

const responseSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    respondedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  }
);

const requestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    bloodGroup: {
      type: String,
      enum: [
        "A+",
        "A-",
        "B+",
        "B-",
        "AB+",
        "AB-",
        "O+",
        "O-",
      ],
      required: true,
    },

    hospital: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    unitsNeeded: {
      type: Number,
      required: true,
      min: 1,
    },

    urgency: {
      type: String,
      enum: ["low", "medium", "critical"],
      default: "medium",
    },

    status: {
      type: String,
      enum: [
        "open",
        "fulfilled",
        "cancelled",
        "expired",
        "removed",
      ],
      default: "open",
      index: true,
    },

    location: {
      lat: {
        type: Number,
        required: true,
      },
      lng: {
        type: Number,
        required: true,
      },
    },

    // Hospital verification document.
    // Required when creating a request.
    // Removed when request is fulfilled/cancelled.
    verificationDocument: {
      type: String,
      default: null,
    },

    reportCount: {
      type: Number,
      default: 0,
    },

    reportedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Donors who currently want to donate for this request.
    respondedDonors: [responseSchema],
  },
  {
    timestamps: true,
  }
);

requestSchema.index({
  bloodGroup: 1,
  city: 1,
  status: 1,
});

// Number of unique community reports required to remove a request.
const REPORT_THRESHOLD = 10;

module.exports = mongoose.model("Request", requestSchema);
module.exports.REPORT_THRESHOLD = REPORT_THRESHOLD;