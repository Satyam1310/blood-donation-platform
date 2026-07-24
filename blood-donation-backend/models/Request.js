const mongoose = require("mongoose");

const requestSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
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
      enum: ["open", "fulfilled", "expired", "removed"],
      default: "open",
      index: true,
    },
    // Pinpoint location dropped by the requester on the map, used for
    // distance-based search/display alongside the free-text city field.
    location: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
    },
    // Path to the uploaded hospital document (prescription, admission
    // slip, etc.) that proves the request is genuine. Requests go live
    // immediately — there's no admin approval step. Instead, the
    // community can report a request; once reportCount hits the
    // threshold (see REPORT_THRESHOLD below), it's auto-removed.
    verificationDocument: {
      type: String,
      required: true,
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
    respondedDonors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

requestSchema.index({ bloodGroup: 1, city: 1, status: 1 });

// Number of community reports at which a request is automatically removed
const REPORT_THRESHOLD = 10;

module.exports = mongoose.model("Request", requestSchema);
module.exports.REPORT_THRESHOLD = REPORT_THRESHOLD;
