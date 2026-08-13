const DonorProfile = require("../models/DonorProfile");
const DonationHistory = require("../models/DonationHistory");
const User = require("../models/User");

const calculateAvailability = (lastDonationDate) => {
  if (!lastDonationDate) return true;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return new Date(lastDonationDate) <= thirtyDaysAgo;
};

const calculateEligibility = (lastDonationDate) => {
  if (!lastDonationDate) return true;

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  return new Date(lastDonationDate) <= ninetyDaysAgo;
};

// ---------------------------------------------------------
// GET MY PROFILE
// ---------------------------------------------------------

// @route GET /api/donors/me
const getMyProfile = async (req, res) => {
  try {
    const profile = await DonorProfile.findOne({
      user: req.user._id,
    }).populate(
      "user",
      "name email phone emailVerified phoneVerified showEmail showPhone"
    );

    if (!profile) {
      return res.status(404).json({
        message: "Donor profile not found",
      });
    }

    res.status(200).json({ profile });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch profile",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// PUBLIC DONOR PROFILE
// ---------------------------------------------------------

// @route GET /api/donors/:id
// Authenticated users can view another donor's public profile.
//
// Contact information is filtered on the backend.
// Hidden contact details are NOT returned.
const getPublicDonorProfile = async (req, res) => {
  try {
    const profile = await DonorProfile.findById(req.params.id).populate(
      "user",
      "name email phone emailVerified phoneVerified showEmail showPhone"
    );

    if (!profile || !profile.user) {
      return res.status(404).json({
        message: "Donor profile not found",
      });
    }

    const donationRecords = await DonationHistory.find({
      donor: profile.user._id,
    }).sort({ date: -1 });

    const totalDonations = donationRecords.length;

    const lastDonationDate =
      donationRecords.length > 0
        ? donationRecords[0].date
        : profile.lastDonationDate || null;

    const isAvailable = calculateAvailability(lastDonationDate);
    const isEligible = calculateEligibility(lastDonationDate);

    let eligibleByDate = null;

    if (!isEligible && lastDonationDate) {
      eligibleByDate = new Date(lastDonationDate);
      eligibleByDate.setDate(eligibleByDate.getDate() + 90);
    }

    const user = profile.user;

    const donor = {
      id: user._id,
      name: user.name,

      bloodGroup: profile.bloodGroup,
      city: profile.city,
      pincode: profile.pincode || "",

      isAvailable,

      totalDonations,
      lastDonationDate,

      eligibleByDate,
      isEligible,

      emailVerified: Boolean(user.emailVerified),
      phoneVerified: Boolean(user.phoneVerified),
    };

    // Email is returned only when:
    // 1. Email is verified
    // 2. User has enabled showEmail
    if (user.emailVerified === true && user.showEmail === true) {
      donor.email = user.email;
    }

    // Phone is returned only when:
    // 1. Phone is considered verified
    // 2. User has enabled showPhone
    // 3. Phone exists
    if (
      user.phoneVerified === true &&
      user.showPhone === true &&
      user.phone
    ) {
      donor.phone = user.phone;
    }

    res.status(200).json({
      donor,

      medicalDisclaimer:
        "Final donation eligibility and medical suitability must be confirmed by the blood bank or a qualified medical professional.",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch donor profile",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// UPDATE MY PROFILE
// ---------------------------------------------------------

// @route PUT /api/donors/me
const updateMyProfile = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      bloodGroup,
      city,
      pincode,
      isAvailable,
    } = req.body;

    // -----------------------------------------------------
    // Find authenticated user
    // -----------------------------------------------------

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // -----------------------------------------------------
    // Update personal user fields
    // -----------------------------------------------------

    if (name !== undefined) {
      const trimmedName = String(name).trim();

      if (!trimmedName) {
        return res.status(400).json({
          message: "Name cannot be empty",
        });
      }

      user.name = trimmedName;
    }

    if (phone !== undefined) {
      user.phone = String(phone).trim();
    }

    // -----------------------------------------------------
    // Email change
    // -----------------------------------------------------

    let emailChanged = false;

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();

      if (!normalizedEmail) {
        return res.status(400).json({
          message: "Email cannot be empty",
        });
      }

      // Only perform the email-change flow when the
      // supplied email is actually different.
      if (normalizedEmail !== user.email) {
        // Check whether another account already uses it.
        const existingUser = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: user._id },
        });

        if (existingUser) {
          return res.status(409).json({
            message: "An account with this email already exists",
          });
        }

        user.email = normalizedEmail;

        // -------------------------------------------------
        // IMPORTANT:
        // A changed email must be verified again.
        // -------------------------------------------------

        user.emailVerified = false;

        // Remove any previous verification code.
        user.emailVerificationTokenHash = null;
        user.emailVerificationExpires = null;

        emailChanged = true;
      }
    }

    await user.save();

    // -----------------------------------------------------
    // Update donor profile
    // -----------------------------------------------------

    const profile = await DonorProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        ...(bloodGroup !== undefined && {
          bloodGroup,
        }),

        ...(city !== undefined && {
          city: String(city).trim(),
        }),

        ...(pincode !== undefined && {
          pincode: String(pincode).trim(),
        }),

        ...(isAvailable !== undefined && {
          isAvailable,
        }),
      },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    ).populate(
      "user",
      "name email phone emailVerified phoneVerified showEmail showPhone"
    );

    // -----------------------------------------------------
    // Response
    // -----------------------------------------------------

    res.status(200).json({
      message: emailChanged
        ? "Profile updated. Please verify your new email address."
        : "Profile updated successfully",

      emailChanged,

      requiresEmailVerification: emailChanged,

      profile,
    });
  } catch (error) {
    // MongoDB duplicate-key protection for email.
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists",
      });
    }

    res.status(500).json({
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// SEARCH DONORS
// ---------------------------------------------------------

// @route GET /api/donors/search
const searchDonors = async (req, res) => {
  try {
    const {
      bloodGroup,
      city,
      pincode,
      availableOnly,
      eligibleOnly,
    } = req.query;

    const query = {};

    if (bloodGroup) {
      query.bloodGroup = bloodGroup;
    }

    if (city) {
      query.city = new RegExp(city.trim(), "i");
    }

    if (pincode) {
      query.pincode = pincode;
    }

    if (availableOnly === "true") {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      query.$or = [
        { lastDonationDate: null },
        {
          lastDonationDate: {
            $lte: thirtyDaysAgo,
          },
        },
      ];
    }

    if (eligibleOnly === "true") {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const eligibilityCondition = {
        $or: [
          { lastDonationDate: null },
          {
            lastDonationDate: {
              $lte: ninetyDaysAgo,
            },
          },
        ],
      };

      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          eligibilityCondition,
        ];

        delete query.$or;
      } else {
        query.$or = eligibilityCondition.$or;
      }
    }

    const donors = await DonorProfile.find(query)
      .populate("user", "name")
      .limit(100);

    const publicDonors = donors.map((donor) => ({
      _id: donor._id,

      user: donor.user
        ? {
            _id: donor.user._id,
            name: donor.user.name,
          }
        : null,

      bloodGroup: donor.bloodGroup,
      city: donor.city,
      pincode: donor.pincode,

      isAvailable: calculateAvailability(
        donor.lastDonationDate
      ),

      lastDonationDate: donor.lastDonationDate,

      isEligible: calculateEligibility(
        donor.lastDonationDate
      ),
    }));

    res.status(200).json({
      count: publicDonors.length,
      donors: publicDonors,
    });
  } catch (error) {
    res.status(500).json({
      message: "Search failed",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// ADD DONATION RECORD
// ---------------------------------------------------------

// @route POST /api/donors/history
const addDonationRecord = async (req, res) => {
  try {
    const {
      date,
      location,
      hospital,
      unitsGiven,
      bloodGroup,
    } = req.body;

    if (!date) {
      return res.status(400).json({
        message: "Date is required",
      });
    }

    const profile = await DonorProfile.findOne({
      user: req.user._id,
    });

    const resolvedBloodGroup =
      bloodGroup || profile?.bloodGroup;

    if (!resolvedBloodGroup) {
      return res.status(400).json({
        message:
          "No blood group on file — please set it in your profile first",
      });
    }

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existing = await DonationHistory.findOne({
      donor: req.user._id,
      date: {
        $gte: dayStart,
        $lte: dayEnd,
      },
    });

    if (existing) {
      return res.status(409).json({
        message:
          "You already have a donation logged for this date",
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

    if (
      profile &&
      (!profile.lastDonationDate ||
        new Date(date) > profile.lastDonationDate)
    ) {
      profile.lastDonationDate = date;
      profile.isAvailable = calculateAvailability(date);

      await profile.save();
    }

    res.status(201).json({
      record,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add donation record",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// UPDATE DONATION RECORD
// ---------------------------------------------------------

// @route PUT /api/donors/history/:id
const updateDonationRecord = async (req, res) => {
  try {
    const record = await DonationHistory.findById(
      req.params.id
    );

    if (!record) {
      return res.status(404).json({
        message: "Donation record not found",
      });
    }

    if (
      record.donor.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message:
          "You can only edit your own donation records",
      });
    }

    const {
      date,
      location,
      hospital,
      unitsGiven,
      bloodGroup,
    } = req.body;

    if (date) record.date = date;

    if (location !== undefined) {
      record.location = location;
    }

    if (hospital !== undefined) {
      record.hospital = hospital;
    }

    if (unitsGiven) {
      record.unitsGiven = unitsGiven;
    }

    if (bloodGroup) {
      record.bloodGroup = bloodGroup;
    }

    await record.save();

    const mostRecent = await DonationHistory.findOne({
      donor: req.user._id,
    }).sort({ date: -1 });

    const latestDonationDate = mostRecent
      ? mostRecent.date
      : null;

    await DonorProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        lastDonationDate: latestDonationDate,
        isAvailable:
          calculateAvailability(latestDonationDate),
      }
    );

    res.status(200).json({
      record,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update donation record",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// DELETE DONATION RECORD
// ---------------------------------------------------------

// @route DELETE /api/donors/history/:id
const deleteDonationRecord = async (req, res) => {
  try {
    const record = await DonationHistory.findById(
      req.params.id
    );

    if (!record) {
      return res.status(404).json({
        message: "Donation record not found",
      });
    }

    if (
      record.donor.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message:
          "You can only delete your own donation records",
      });
    }

    await record.deleteOne();

    const mostRecent = await DonationHistory.findOne({
      donor: req.user._id,
    }).sort({ date: -1 });

    const latestDonationDate = mostRecent
      ? mostRecent.date
      : null;

    await DonorProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        lastDonationDate: latestDonationDate,
        isAvailable:
          calculateAvailability(latestDonationDate),
      }
    );

    res.status(200).json({
      message: "Donation record deleted",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete donation record",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// MY DONATION HISTORY
// ---------------------------------------------------------

// @route GET /api/donors/history
const getMyDonationHistory = async (req, res) => {
  try {
    const records = await DonationHistory.find({
      donor: req.user._id,
    }).sort({ date: -1 });

    const profile = await DonorProfile.findOne({
      user: req.user._id,
    }).populate(
      "user",
      "name email phone emailVerified phoneVerified showEmail showPhone"
    );

    const totalDonations = records.length;

    const estimatedLivesImpacted =
      totalDonations * 3;

    const milestones = [
      { threshold: 1, label: "First Drop" },
      { threshold: 5, label: "Regular Hero" },
      { threshold: 10, label: "Lifesaver" },
      { threshold: 25, label: "Champion Donor" },
      { threshold: 50, label: "Legend" },
    ];

    const earnedMilestones = milestones.filter(
      (m) => totalDonations >= m.threshold
    );

    const nextMilestone =
      milestones.find(
        (m) => totalDonations < m.threshold
      ) || null;

    let nextEligibleDate = null;
    let isEligibleNow = true;

    if (records.length > 0) {
      const lastDate = new Date(records[0].date);

      nextEligibleDate = new Date(lastDate);
      nextEligibleDate.setDate(
        nextEligibleDate.getDate() + 90
      );

      isEligibleNow =
        nextEligibleDate <= new Date();
    }

    res.status(200).json({
      donor: profile
        ? {
            name: profile.user?.name,
            bloodGroup: profile.bloodGroup,
            city: profile.city,
            isAvailable: profile.lastDonationDate
              ? calculateAvailability(
                  profile.lastDonationDate
                )
              : true,
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
    res.status(500).json({
      message: "Failed to fetch donation history",
      error: error.message,
    });
  }
};

module.exports = {
  getMyProfile,
  getPublicDonorProfile,
  updateMyProfile,
  searchDonors,
  addDonationRecord,
  updateDonationRecord,
  deleteDonationRecord,
  getMyDonationHistory,
};