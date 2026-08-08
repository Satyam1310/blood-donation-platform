const DonorProfile = require("../models/DonorProfile");
const DonationHistory = require("../models/DonationHistory");

const calculateAvailability = (lastDonationDate) => {
  if (!lastDonationDate) return true;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(
    thirtyDaysAgo.getDate() - 30
  );

  return new Date(lastDonationDate) <= thirtyDaysAgo;
};

const calculateEligibility = (lastDonationDate) => {
  if (!lastDonationDate) return true;

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(
    ninetyDaysAgo.getDate() - 90
  );

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
// Authenticated users can view another donor's
// public profile.
//
// Contact information is filtered on the backend.
// Hidden contact details are NOT returned.
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

    const donationRecords =
      await DonationHistory.find({
        donor: profile.user._id,
      }).sort({ date: -1 });

    const totalDonations =
      donationRecords.length;

    const lastDonationDate =
      donationRecords.length > 0
        ? donationRecords[0].date
        : profile.lastDonationDate || null;

    const isAvailable =
      calculateAvailability(lastDonationDate);

    const isEligible =
      calculateEligibility(lastDonationDate);

    let eligibleByDate = null;

    if (!isEligible && lastDonationDate) {
      eligibleByDate = new Date(
        lastDonationDate
      );

      eligibleByDate.setDate(
        eligibleByDate.getDate() + 90
      );
    }

    const user = profile.user;

    // ---------------------------------------------
    // Build safe public donor object
    // ---------------------------------------------

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

      // Verification status can be displayed,
      // but actual contact information is filtered below.
      emailVerified: Boolean(
        user.emailVerified
      ),

      phoneVerified: Boolean(
        user.phoneVerified
      ),
    };

    // ---------------------------------------------
    // EMAIL PRIVACY
    // ---------------------------------------------

    if (
      user.emailVerified === true &&
      user.showEmail === true
    ) {
      donor.email = user.email;
    }

    // ---------------------------------------------
    // PHONE PRIVACY
    // ---------------------------------------------

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
      message:
        "Failed to fetch donor profile",
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
      bloodGroup,
      city,
      pincode,
      isAvailable,
      lastDonationDate,
    } = req.body;

    const profile =
      await DonorProfile.findOneAndUpdate(
        { user: req.user._id },
        {
          bloodGroup,
          city,
          pincode,
          isAvailable,
          lastDonationDate,
        },
        {
          new: true,
          upsert: true,
          runValidators: true,
        }
      );

    res.status(200).json({
      profile,
    });
  } catch (error) {
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
      query.city = new RegExp(
        city.trim(),
        "i"
      );
    }

    if (pincode) {
      query.pincode = pincode;
    }

    // Available = no donation OR 30+ days since
    // last donation.
    if (availableOnly === "true") {
      const thirtyDaysAgo = new Date();

      thirtyDaysAgo.setDate(
        thirtyDaysAgo.getDate() - 30
      );

      query.$or = [
        { lastDonationDate: null },
        {
          lastDonationDate: {
            $lte: thirtyDaysAgo,
          },
        },
      ];
    }

    // Eligible = no donation OR 90+ days since
    // last donation.
    if (eligibleOnly === "true") {
      const ninetyDaysAgo = new Date();

      ninetyDaysAgo.setDate(
        ninetyDaysAgo.getDate() - 90
      );

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

      // If both filters are selected,
      // both conditions must be satisfied.
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          eligibilityCondition,
        ];

        delete query.$or;
      } else {
        query.$or =
          eligibilityCondition.$or;
      }
    }

    const donors =
      await DonorProfile.find(query)
        .populate(
          "user",
          "name"
        )
        .limit(100);

    // Do NOT return contact information from search.
    // Users must open the donor's profile.
    const publicDonors = donors.map(
      (donor) => ({
        _id: donor._id,

        user: donor.user
          ? {
              _id: donor.user._id,
              name: donor.user.name,
            }
          : null,

        bloodGroup:
          donor.bloodGroup,

        city: donor.city,

        pincode:
          donor.pincode,

        isAvailable:
          calculateAvailability(
            donor.lastDonationDate
          ),

        lastDonationDate:
          donor.lastDonationDate,

        isEligible:
          calculateEligibility(
            donor.lastDonationDate
          ),
      })
    );

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
const addDonationRecord = async (
  req,
  res
) => {
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

    const profile =
      await DonorProfile.findOne({
        user: req.user._id,
      });

    const resolvedBloodGroup =
      bloodGroup ||
      profile?.bloodGroup;

    if (!resolvedBloodGroup) {
      return res.status(400).json({
        message:
          "No blood group on file — please set it in your profile first",
      });
    }

    // Prevent duplicate entries on the same
    // calendar day.
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setHours(
      23,
      59,
      59,
      999
    );

    const existing =
      await DonationHistory.findOne({
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

    const record =
      await DonationHistory.create({
        donor: req.user._id,
        date,
        location,
        hospital,
        unitsGiven:
          unitsGiven || 1,
        bloodGroup:
          resolvedBloodGroup,
      });

    // Keep profile synchronized with the
    // latest donation.
    if (
      profile &&
      (!profile.lastDonationDate ||
        new Date(date) >
          profile.lastDonationDate)
    ) {
      profile.lastDonationDate =
        date;

      profile.isAvailable =
        calculateAvailability(
          date
        );

      await profile.save();
    }

    res.status(201).json({
      record,
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to add donation record",
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
        message:
          "Donation record not found",
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
      record.unitsGiven =
        unitsGiven;
    }

    if (bloodGroup) {
      record.bloodGroup =
        bloodGroup;
    }

    await record.save();

    const mostRecent =
      await DonationHistory.findOne({
        donor: req.user._id,
      }).sort({ date: -1 });

    const latestDonationDate =
      mostRecent
        ? mostRecent.date
        : null;

    await DonorProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        lastDonationDate:
          latestDonationDate,

        isAvailable:
          calculateAvailability(
            latestDonationDate
          ),
      }
    );

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
        message:
          "Donation record not found",
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

    const mostRecent =
      await DonationHistory.findOne({
        donor: req.user._id,
      }).sort({ date: -1 });

    const latestDonationDate =
      mostRecent
        ? mostRecent.date
        : null;

    await DonorProfile.findOneAndUpdate(
      { user: req.user._id },
      {
        lastDonationDate:
          latestDonationDate,

        isAvailable:
          calculateAvailability(
            latestDonationDate
          ),
      }
    );

    res.status(200).json({
      message:
        "Donation record deleted",
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
      const lastDate =
        new Date(records[0].date);

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

    res.status(200).json({
      donor: profile
        ? {
            name:
              profile.user?.name,

            bloodGroup:
              profile.bloodGroup,

            city:
              profile.city,

            isAvailable:
              profile.lastDonationDate
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
      message:
        "Failed to fetch donation history",
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