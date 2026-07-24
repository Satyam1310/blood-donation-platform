const Request = require("../models/Request");

// @route POST /api/requests
// Any logged-in donor can start a request for themselves or someone else.
// Requires a map location and a hospital document — the request goes live
// immediately (no admin approval); the community can report it if it looks
// fake (see reportRequest below).
const createRequest = async (req, res) => {
  try {
    const { bloodGroup, hospital, city, unitsNeeded, urgency, lat, lng } = req.body;

    if (!bloodGroup || !hospital || !city || !unitsNeeded || !lat || !lng) {
      return res.status(400).json({
        message: "Blood group, hospital, city, units needed, and map location are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "A hospital document is required to submit this request",
      });
    }

    const request = await Request.create({
      requester: req.user._id,
      bloodGroup,
      hospital,
      city,
      unitsNeeded,
      urgency,
      location: { lat: parseFloat(lat), lng: parseFloat(lng) },
      verificationDocument: `/uploads/verification-docs/${req.file.filename}`,
    });

    res.status(201).json({ request });
  } catch (error) {
    res.status(500).json({ message: "Failed to create request", error: error.message });
  }
};

// @route GET /api/requests?status=&bloodGroup=&city=
const getRequests = async (req, res) => {
  try {
    const { status, bloodGroup, city } = req.query;

    const query = {};
    if (status) query.status = status;
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (city) query.city = new RegExp(city, "i");

    const requests = await Request.find(query)
      .populate("requester", "name email phone")
      .sort({ createdAt: -1 });

    res.status(200).json({ count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch requests", error: error.message });
  }
};

// @route PUT /api/requests/:id/report
// Any logged-in user can report a request as fake/spam/wrong. No admin gate —
// moderation is community-driven. Once a request collects REPORT_THRESHOLD
// unique reports, it's automatically taken down (status -> "removed").
const reportRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.requester.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You can't report your own request" });
    }

    if (request.reportedBy.some((id) => id.toString() === req.user._id.toString())) {
      return res.status(409).json({ message: "You've already reported this request" });
    }

    request.reportedBy.push(req.user._id);
    request.reportCount += 1;

    if (request.reportCount >= Request.REPORT_THRESHOLD && request.status === "open") {
      request.status = "removed";
    }

    await request.save();

    res.status(200).json({ request });
  } catch (error) {
    res.status(500).json({ message: "Failed to report request", error: error.message });
  }
};

// @route PUT /api/requests/:id/respond
// A donor responds to an open request
const respondToRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (request.status !== "open") {
      return res.status(400).json({ message: "This request is no longer open" });
    }

    if (!request.respondedDonors.includes(req.user._id)) {
      request.respondedDonors.push(req.user._id);
      await request.save();
    }

    res.status(200).json({ request });
  } catch (error) {
    res.status(500).json({ message: "Failed to respond to request", error: error.message });
  }
};

// @route PUT /api/requests/:id/status
// Requester marks the request as fulfilled/expired
const updateRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["open", "fulfilled", "expired"].includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const request = await Request.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }
    if (request.requester.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the requester can update this request" });
    }

    request.status = status;
    await request.save();

    res.status(200).json({ request });
  } catch (error) {
    res.status(500).json({ message: "Failed to update request", error: error.message });
  }
};

module.exports = {
  createRequest,
  getRequests,
  respondToRequest,
  updateRequestStatus,
  reportRequest,
};
