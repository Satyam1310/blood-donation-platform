const express = require("express");

const {
  getMyProfile,
  getPublicDonorProfile,
  updateMyProfile,
  searchDonors,
  addDonationRecord,
  updateDonationRecord,
  deleteDonationRecord,
  getMyDonationHistory,
} = require("../controllers/donorController");

const { protect } = require("../middleware/auth");

const router = express.Router();

// All donor information requires authentication
router.use(protect);

// Donor search
router.get("/search", searchDonors);

// Own profile
// Must come before /:id
router.get("/me", getMyProfile);
router.put("/me", updateMyProfile);

// Donation history
router.post("/history", addDonationRecord);
router.get("/history", getMyDonationHistory);
router.put("/history/:id", updateDonationRecord);
router.delete("/history/:id", deleteDonationRecord);

// Individual donor public profile
router.get("/:id", getPublicDonorProfile);

module.exports = router;