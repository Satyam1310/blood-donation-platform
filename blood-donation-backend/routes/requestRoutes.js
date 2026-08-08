const express = require("express");

const {
  createRequest,
  getRequests,
  getMyRequests,
  respondToRequest,
  withdrawResponse,
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

// I Can Donate.
router.put("/:id/respond", respondToRequest);

// Withdraw I Can Donate.
router.delete("/:id/respond", withdrawResponse);

// Update own request status.
router.put("/:id/status", updateRequestStatus);

// Delete a finished request.
router.delete("/:id", deleteRequest);

// Report someone else's request.
router.put("/:id/report", reportRequest);

module.exports = router;