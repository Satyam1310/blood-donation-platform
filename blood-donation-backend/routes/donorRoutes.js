const express = require("express");
const {
  getMyProfile,
  updateMyProfile,
  searchDonors,
  addDonationRecord,
  updateDonationRecord,
  deleteDonationRecord,
  getMyDonationHistory,
} = require("../controllers/donorController");
const { protect } = require("../middleware/auth");

const router = express.Router();

// Public search — anyone can search for donors
router.get("/search", searchDonors);

// Everything below requires a logged-in user
router.use(protect);

router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);
router.post("/history", addDonationRecord);
router.get("/history", getMyDonationHistory);
router.put("/history/:id", updateDonationRecord);
router.delete("/history/:id", deleteDonationRecord);

module.exports = router;
