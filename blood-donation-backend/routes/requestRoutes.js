const express = require("express");

const {
  createRequest,
  getRequests,
  getMyRequests,
  respondToRequest,
  updateRequestStatus,
  deleteRequest,
  reportRequest,
} = require("../controllers/requestController");

const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

// Public/active requests.
// Only open requests are returned by the controller.
router.get("/", getRequests);

// Everything below requires authentication.
router.use(protect);

// Requester's own requests.
// Includes open, fulfilled and cancelled requests.
router.get("/my", getMyRequests);

// Create a blood request.
router.post(
  "/",
  upload.single("document"),
  createRequest
);

// Respond to an active request.
router.put("/:id/respond", respondToRequest);

// Update own request status.
router.put("/:id/status", updateRequestStatus);

// Delete a finished request from My Requests.
router.delete("/:id", deleteRequest);

// Report someone else's request.
router.put("/:id/report", reportRequest);

module.exports = router;