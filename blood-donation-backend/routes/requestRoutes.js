const express = require("express");
const {
  createRequest,
  getRequests,
  respondToRequest,
  updateRequestStatus,
  reportRequest,
} = require("../controllers/requestController");
const { protect } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();

router.get("/", getRequests); // public — anyone can browse open requests

router.use(protect);

// "document" must match the FormData field name used on the frontend
router.post("/", upload.single("document"), createRequest);
router.put("/:id/respond", respondToRequest);
router.put("/:id/status", updateRequestStatus);
router.put("/:id/report", reportRequest);

module.exports = router;
