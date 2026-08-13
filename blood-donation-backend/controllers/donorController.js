const DonorProfile = require("../models/DonorProfile");
const DonationHistory = require("../models/DonationHistory");
const User = require("../models/User");

// ---------------------------------------------------------
// AVAILABILITY / ELIGIBILITY HELPERS
// ---------------------------------------------------------

const calculateAvailability = (
  lastDonationDate,
  userAvailability = true
) => {
  if (!lastDonationDate) {
    return userAvailability;
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  if (new Date(lastDonationDate) > thirtyDaysAgo) {
    return false;
  }

  return Boolean(userAvailability);
};

const calculateEligibility = (lastDonationDate) => {
  if (!lastDonationDate) {
    return true;
  }

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  return new Date(lastDonationDate) <= ninetyDaysAgo;
};

// ---------------------------------------------------------
// UPDATE PROFILE AVAILABILITY AFTER DONATION CHANGE
// ---------------------------------------------------------

const syncDonationStatus = async (userId) => {
  const profile = await DonorProfile.findOne({
    user: userId,
  });

  if (!profile) {
    return;
  }

  const mostRecent = await DonationHistory.findOne({
    donor: userId,
  }).sort({ date: -1 });

  const latestDonationDate = mostRecent
    ? mostRecent.date
    : null;

  profile.lastDonationDate = latestDonationDate;

  // Preserve the user's existing manual availability
  // preference when possible.
  profile.isAvailable = calculateAvailability(
    latestDonationDate,
    profile.isAvailable
  );

  await profile.save();
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

    // Return calculated availability instead of blindly
    // trusting the stored value.
    const actualAvailability = calculateAvailability(
      profile.lastDonationDate,
      profile.isAvailable
    );

    // Return calculated eligibility as well.
    const isEligible = calculateEligibility(
      profile.lastDonationDate
    );

    const profileObject = profile.toObject();

    profileObject.isAvailable = actualAvailability;
    profileObject.isEligible = isEligible;

    res.status(200).json({
      profile: profileObject,
    });
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
const getPublicDonorProfile = async (req, res) => {
  try {
    const profile = await DonorProfile.findById(
      req.params.id
    ).populate(
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

    const isAvailable = calculateAvailability(
      lastDonationDate,
      profile.isAvailable
    );

    const isEligible =
      calculateEligibility(lastDonationDate);

    let eligibleByDate = null;

    if (!isEligible && lastDonationDate) {
      eligibleByDate = new Date(lastDonationDate);

      eligibleByDate.setDate(
        eligibleByDate.getDate() + 90
      );
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
    if (
      user.emailVerified === true &&
      user.showEmail === true
    ) {
      donor.email = user.email;
    }

    // Phone is returned only when:
    // 1. Phone is verified
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

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // -----------------------------------------------------
    // UPDATE USER FIELDS
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
    // EMAIL CHANGE
    // -----------------------------------------------------

    let emailChanged = false;

    if (email !== undefined) {
      const normalizedEmail = String(email)
        .trim()
        .toLowerCase();

      if (!normalizedEmail) {
        return res.status(400).json({
          message: "Email cannot be empty",
        });
      }

      if (normalizedEmail !== user.email) {
        const existingUser = await User.findOne({
          email: normalizedEmail,
          _id: { $ne: user._id },
        });

        if (existingUser) {
          return res.status(409).json({
            message:
              "An account with this email already exists",
          });
        }

        user.email = normalizedEmail;

        user.emailVerified = false;

        user.emailVerificationTokenHash = null;
        user.emailVerificationExpires = null;

        emailChanged = true;
      }
    }

    await user.save();

    // -----------------------------------------------------
    // UPDATE DONOR PROFILE
    // -----------------------------------------------------

    const profile = await DonorProfile.findOneAndUpdate(
      {
        user: req.user._id,
      },
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
          isAvailable: Boolean(isAvailable),
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

    // Calculate actual availability.
    const actualAvailability = calculateAvailability(
      profile.lastDonationDate,
      profile.isAvailable
    );

    const profileObject = profile.toObject();

    profileObject.isAvailable = actualAvailability;

    profileObject.isEligible = calculateEligibility(
      profile.lastDonationDate
    );

    res.status(200).json({
      message: emailChanged
        ? "Profile updated. Please verify your new email address."
        : "Profile updated successfully",

      emailChanged,

      requiresEmailVerification: emailChanged,

      profile: profileObject,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message:
          "An account with this email already exists",
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

    // -----------------------------------------------------
    // AVAILABLE ONLY
    // -----------------------------------------------------
    //
    // A donor is available only if:
    //
    // 1. They have no donation history
    //    OR their latest donation was 30+ days ago
    //
    // AND
    //
    // 2. Their manual availability toggle is ON.
    //
    if (availableOnly === "true") {
      const thirtyDaysAgo = new Date();

      thirtyDaysAgo.setDate(
        thirtyDaysAgo.getDate() - 30
      );

      query.isAvailable = true;

      query.$or = [
        {
          lastDonationDate: null,
        },
        {
          lastDonationDate: {
            $lte: thirtyDaysAgo,
          },
        },
      ];
    }

    // -----------------------------------------------------
    // ELIGIBLE ONLY
    // -----------------------------------------------------

    if (eligibleOnly === "true") {
      const ninetyDaysAgo = new Date();

      ninetyDaysAgo.setDate(
        ninetyDaysAgo.getDate() - 90
      );

      const eligibilityCondition = {
        $or: [
          {
            lastDonationDate: null,
          },
          {
            lastDonationDate: {
              $lte: ninetyDaysAgo,
            },
          },
        ],
      };

      if (query.$or) {
        query.$and = [
          {
            $or: query.$or,
          },
          eligibilityCondition,
        ];

        delete query.$or;
      } else {
        query.$or =
          eligibilityCondition.$or;
      }
    }

    const donors = await DonorProfile.find(query)
      .populate("user", "name")
      .limit(100);

    const publicDonors = donors.map((donor) => {
      const isAvailable =
        calculateAvailability(
          donor.lastDonationDate,
          donor.isAvailable
        );

      const isEligible =
        calculateEligibility(
          donor.lastDonationDate
        );

      return {
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

        isAvailable,

        lastDonationDate:
          donor.lastDonationDate,

        isEligible,
      };
    });

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

    const donationDate = new Date(date);

    if (Number.isNaN(donationDate.getTime())) {
      return res.status(400).json({
        message: "Invalid donation date",
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

    // -----------------------------------------------------
    // PREVENT DUPLICATE DONATION ON SAME DATE
    // -----------------------------------------------------

    const dayStart = new Date(donationDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(donationDate);
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

    // -----------------------------------------------------
    // CREATE DONATION RECORD
    // -----------------------------------------------------

    const record = await DonationHistory.create({
      donor: req.user._id,
      date: donationDate,
      location,
      hospital,
      unitsGiven: unitsGiven || 1,
      bloodGroup: resolvedBloodGroup,
    });

    // -----------------------------------------------------
    // UPDATE PROFILE
    // -----------------------------------------------------
    //
    // Only update lastDonationDate when this is the newest
    // donation.
    //
    // A new donation always makes the donor unavailable
    // for the next 30 days.
    //
    if (
      profile &&
      (!profile.lastDonationDate ||
        donationDate > profile.lastDonationDate)
    ) {
      profile.lastDonationDate =
        donationDate;

      profile.isAvailable = false;

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
const updateDonationRecord = async (
  req,
  res
) => {
  try {
    const record =
      await DonationHistory.findById(
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

    if (date !== undefined) {
      const updatedDate = new Date(date);

      if (Number.isNaN(updatedDate.getTime())) {
        return res.status(400).json({
          message: "Invalid donation date",
        });
      }

      record.date = updatedDate;
    }

    if (location !== undefined) {
      record.location = location;
    }

    if (hospital !== undefined) {
      record.hospital = hospital;
    }

    if (unitsGiven !== undefined) {
      record.unitsGiven = unitsGiven;
    }

    if (bloodGroup !== undefined) {
      record.bloodGroup = bloodGroup;
    }

    await record.save();

    // Recalculate latest donation after editing.
    await syncDonationStatus(req.user._id);

    res.status(200).json({
      record,
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to update donation record",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// DELETE DONATION RECORD
// ---------------------------------------------------------

// @route DELETE /api/donors/history/:id
const deleteDonationRecord = async (
  req,
  res
) => {
  try {
    const record =
      await DonationHistory.findById(
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

    // Recalculate latest donation after deletion.
    await syncDonationStatus(req.user._id);

    res.status(200).json({
      message: "Donation record deleted",
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to delete donation record",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// MY DONATION HISTORY
// ---------------------------------------------------------

// @route GET /api/donors/history
const getMyDonationHistory = async (
  req,
  res
) => {
  try {
    const records =
      await DonationHistory.find({
        donor: req.user._id,
      }).sort({ date: -1 });

    const profile =
      await DonorProfile.findOne({
        user: req.user._id,
      }).populate(
        "user",
        "name email phone emailVerified phoneVerified showEmail showPhone"
      );

    const totalDonations =
      records.length;

    const estimatedLivesImpacted =
      totalDonations * 3;

    const milestones = [
      {
        threshold: 1,
        label: "First Drop",
      },
      {
        threshold: 5,
        label: "Regular Hero",
      },
      {
        threshold: 10,
        label: "Lifesaver",
      },
      {
        threshold: 25,
        label: "Champion Donor",
      },
      {
        threshold: 50,
        label: "Legend",
      },
    ];

    const earnedMilestones =
      milestones.filter(
        (m) =>
          totalDonations >=
          m.threshold
      );

    const nextMilestone =
      milestones.find(
        (m) =>
          totalDonations <
          m.threshold
      ) || null;

    let nextEligibleDate = null;
    let isEligibleNow = true;

    if (records.length > 0) {
      const lastDate = new Date(
        records[0].date
      );

      nextEligibleDate =
        new Date(lastDate);

      nextEligibleDate.setDate(
        nextEligibleDate.getDate() +
          90
      );

      isEligibleNow =
        nextEligibleDate <=
        new Date();
    }

    const actualAvailability =
      profile
        ? calculateAvailability(
            profile.lastDonationDate,
            profile.isAvailable
          )
        : true;

    res.status(200).json({
      donor: profile
        ? {
            name:
              profile.user?.name,
            bloodGroup:
              profile.bloodGroup,
            city: profile.city,

            isAvailable:
              actualAvailability,

            isEligible:
              calculateEligibility(
                profile.lastDonationDate
              ),

            lastDonationDate:
              profile.lastDonationDate,
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
      message:
        "Failed to fetch donation history",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// EXPORTS
// ---------------------------------------------------------

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