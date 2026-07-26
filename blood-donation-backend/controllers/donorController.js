const DonorProfile = require("../models/DonorProfile");
const DonationHistory = require("../models/DonationHistory");

const calculateAvailability = (lastDonationDate) => {
  if (!lastDonationDate) return true;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return new Date(lastDonationDate) <= thirtyDaysAgo;
};

// @route GET /api/donors/me
const getMyProfile = async (req, res) => {
  try {
    const profile = await DonorProfile.findOne({ user: req.user._id }).populate(
      "user",
      "name email phone"
    );
    if (!profile) {
      return res.status(404).json({ message: "Donor profile not found" });
    }
    res.status(200).json({ profile });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch profile", error: error.message });
  }
};

// @route PUT /api/donors/me
const updateMyProfile = async (req, res) => {
  try {
    const { bloodGroup, city, pincode, isAvailable, lastDonationDate } = req.body;

    const profile = await DonorProfile.findOneAndUpdate(
      { user: req.user._id },
      { bloodGroup, city, pincode, isAvailable, lastDonationDate },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({ profile });
  } catch (error) {
    res.status(500).json({ message: "Failed to update profile", error: error.message });
  }
};

// @route GET /api/donors/search?bloodGroup=&city=&pincode=&availableOnly=&eligibleOnly=
const searchDonors = async (req, res) => {
  try {
    const { bloodGroup, city, pincode, availableOnly, eligibleOnly } = req.query;

    const query = {};
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (city) query.city = new RegExp(city, "i");
    if (pincode) query.pincode = pincode;
    if (availableOnly === "true") query.isAvailable = true;

    if (eligibleOnly === "true") {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      query.$or = [
        { lastDonationDate: null },
        { lastDonationDate: { $lte: ninetyDaysAgo } },
      ];
    }

    const donors = await DonorProfile.find(query)
      .populate("user", "name email phone")
      .limit(100);

    res.status(200).json({ count: donors.length, donors });
  } catch (error) {
    res.status(500).json({ message: "Search failed", error: error.message });
  }
};

// @route POST /api/donors/history
const addDonationRecord = async (req, res) => {
  try {
    const { date, location, hospital, unitsGiven, bloodGroup } = req.body;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    // A donor has one blood group — pull it from their profile instead of
    // asking for it on every entry. Only fall back to the request body if
    // there's no profile yet (shouldn't normally happen).
    const profile = await DonorProfile.findOne({ user: req.user._id });
    const resolvedBloodGroup = bloodGroup || profile?.bloodGroup;

    if (!resolvedBloodGroup) {
      return res.status(400).json({
        message: "No blood group on file — please set it in your profile first",
      });
    }

    // Prevent duplicate entries: block a second record on the same calendar
    // day (a donor physically can't donate twice in one day).
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existing = await DonationHistory.findOne({
      donor: req.user._id,
      date: { $gte: dayStart, $lte: dayEnd },
    });
    if (existing) {
      return res.status(409).json({
        message: "You already have a donation logged for this date",
      });
    }

    const record = await DonationHistory.create({
      donor: req.user._id,
      date,
      location,
      hospital,
      unitsGiven: unitsGiven || 1,
      bloodGroup: resolvedBloodGroup,
    });

    // Keep the donor profile's lastDonationDate in sync (only if this is the most recent)
    if (profile && (!profile.lastDonationDate || new Date(date) > profile.lastDonationDate)) {
      profile.lastDonationDate = date;
      profile.isAvailable = calculateAvailability(date);
      await profile.save();
    }

    res.status(201).json({ record });
  } catch (error) {
    res.status(500).json({ message: "Failed to add donation record", error: error.message });
  }
};

// @route PUT /api/donors/history/:id
const updateDonationRecord = async (req, res) => {
  try {
    const record = await DonationHistory.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Donation record not found" });
    }
    if (record.donor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only edit your own donation records" });
    }

    const { date, location, hospital, unitsGiven, bloodGroup } = req.body;
    if (date) record.date = date;
    if (location !== undefined) record.location = location;
    if (hospital !== undefined) record.hospital = hospital;
    if (unitsGiven) record.unitsGiven = unitsGiven;
    if (bloodGroup) record.bloodGroup = bloodGroup;

    await record.save();

    // Re-sync lastDonationDate in case the edited date changed which record is most recent
    const mostRecent = await DonationHistory.findOne({ donor: req.user._id }).sort({ date: -1 });
    const latestDonationDate = mostRecent ? mostRecent.date : null;

    await DonorProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      lastDonationDate: latestDonationDate,
      isAvailable: calculateAvailability(latestDonationDate),
    }
  );

    res.status(200).json({ record });
  } catch (error) {
    res.status(500).json({ message: "Failed to update donation record", error: error.message });
  }
};

// @route DELETE /api/donors/history/:id
// Used both for correcting mistakes and for clearing out duplicate entries
const deleteDonationRecord = async (req, res) => {
  try {
    const record = await DonationHistory.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ message: "Donation record not found" });
    }
    if (record.donor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only delete your own donation records" });
    }

    await record.deleteOne();

    // Re-sync lastDonationDate now that a record is gone
    const mostRecent = await DonationHistory.findOne({ donor: req.user._id }).sort({ date: -1 });

    const latestDonationDate = mostRecent ? mostRecent.date : null;

    await DonorProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      lastDonationDate: latestDonationDate,
      isAvailable: calculateAvailability(latestDonationDate),
    }
    );

    res.status(200).json({ message: "Donation record deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete donation record", error: error.message });
  }
};

// @route GET /api/donors/history
const getMyDonationHistory = async (req, res) => {
  try {
    const records = await DonationHistory.find({ donor: req.user._id }).sort({ date: -1 });
    const profile = await DonorProfile.findOne({ user: req.user._id }).populate(
      "user",
      "name email phone"
    );

    const totalDonations = records.length;
    const estimatedLivesImpacted = totalDonations * 3; // 1 donation ≈ 3 lives, standard estimate

    const milestones = [
      { threshold: 1, label: "First Drop" },
      { threshold: 5, label: "Regular Hero" },
      { threshold: 10, label: "Lifesaver" },
      { threshold: 25, label: "Champion Donor" },
      { threshold: 50, label: "Legend" },
    ];

    const earnedMilestones = milestones.filter((m) => totalDonations >= m.threshold);
    const nextMilestone = milestones.find((m) => totalDonations < m.threshold) || null;

    // Next eligible donation date: 90 days after most recent donation
    let nextEligibleDate = null;
    let isEligibleNow = true;
    if (records.length > 0) {
      const lastDate = new Date(records[0].date);
      nextEligibleDate = new Date(lastDate);
      nextEligibleDate.setDate(nextEligibleDate.getDate() + 90);
      isEligibleNow = nextEligibleDate <= new Date();
    }

    res.status(200).json({
      donor: profile
        ? {
            name: profile.user?.name,
            bloodGroup: profile.bloodGroup,
            city: profile.city,
            isAvailable: profile.isAvailable,
          }
        : null,
      records,
      totalDonations,
      estimatedLivesImpacted,
      earnedMilestones,
      nextMilestone,
      nextEligibleDate,
      isEligibleNow,
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch donation history", error: error.message });
  }
};

module.exports = {
  getMyProfile,
  updateMyProfile,
  searchDonors,
  addDonationRecord,
  updateDonationRecord,
  deleteDonationRecord,
  getMyDonationHistory,
};
