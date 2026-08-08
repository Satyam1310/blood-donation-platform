const Request = require("../models/Request");
const DonorProfile = require("../models/DonorProfile");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const uploadDir = path.join(
  __dirname,
  "..",
  "uploads",
  "verification-docs"
);

fs.mkdirSync(uploadDir, { recursive: true });

const ALLOWED_FILE_TYPES = {
  "application/pdf": {
    extensions: [".pdf"],
    saveExtension: ".pdf",
  },

  "image/jpeg": {
    extensions: [".jpg", ".jpeg"],
    saveExtension: ".jpg",
  },

  "image/png": {
    extensions: [".png"],
    saveExtension: ".png",
  },

  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    {
      extensions: [".docx"],
      saveExtension: ".docx",
    },
};

// ---------------------------------------------------------
// DOCUMENT HELPERS
// ---------------------------------------------------------

const validateDocument = async (file) => {
  if (!file?.buffer) {
    return {
      valid: false,
      message: "No document data received",
    };
  }

  const { fileTypeFromBuffer } = await import("file-type");

  const detectedType =
    await fileTypeFromBuffer(file.buffer);

  if (!detectedType) {
    return {
      valid: false,
      message:
        "Unable to verify the actual document type",
    };
  }

  const allowedType =
    ALLOWED_FILE_TYPES[detectedType.mime];

  if (!allowedType) {
    return {
      valid: false,
      message:
        "The uploaded file is not a supported verification document",
    };
  }

  const originalExtension = path
    .extname(file.originalname)
    .toLowerCase();

  if (
    !allowedType.extensions.includes(
      originalExtension
    )
  ) {
    return {
      valid: false,
      message:
        "The file contents do not match the file extension",
    };
  }

  return {
    valid: true,
    extension: allowedType.saveExtension,
  };
};

const saveDocument = async (
  file,
  extension
) => {
  const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;

  const absolutePath = path.join(
    uploadDir,
    filename
  );

  await fs.promises.writeFile(
    absolutePath,
    file.buffer
  );

  return {
    filename,
    absolutePath,
    publicPath: `/uploads/verification-docs/${filename}`,
  };
};

const deleteVerificationDocument = async (
  documentPath
) => {
  if (!documentPath) return;

  const filename =
    path.basename(documentPath);

  const absolutePath = path.join(
    uploadDir,
    filename
  );

  try {
    await fs.promises.unlink(
      absolutePath
    );
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

// ---------------------------------------------------------
// BLOOD COMPATIBILITY
// ---------------------------------------------------------

/*
  Donor blood group -> recipient/request blood group.

  This is an application-level compatibility check only.
  Final transfusion compatibility and medical eligibility
  must be confirmed by the blood bank / medical professional.
*/

const COMPATIBLE_DONOR_GROUPS = {
  "A+": ["A+", "O+"],

  "A-": ["A-", "O-"],

  "B+": ["B+", "O+"],

  "B-": ["B-", "O-"],

  "AB+": [
    "A+",
    "A-",
    "B+",
    "B-",
    "AB+",
    "AB-",
    "O+",
    "O-",
  ],

  "AB-": [
    "A-",
    "B-",
    "AB-",
    "O-",
  ],

  "O+": ["O+"],

  "O-": ["O-"],
};

const isBloodCompatible = (
  donorBloodGroup,
  requestedBloodGroup
) => {
  if (
    !donorBloodGroup ||
    !requestedBloodGroup
  ) {
    return false;
  }

  return (
    COMPATIBLE_DONOR_GROUPS[
      requestedBloodGroup
    ]?.includes(donorBloodGroup) ||
    false
  );
};

// ---------------------------------------------------------
// ELIGIBILITY
// ---------------------------------------------------------

const isEligibleByDonationHistory = (
  lastDonationDate
) => {
  if (!lastDonationDate) {
    return true;
  }

  const ninetyDaysAgo = new Date();

  ninetyDaysAgo.setDate(
    ninetyDaysAgo.getDate() - 90
  );

  return (
    new Date(lastDonationDate) <=
    ninetyDaysAgo
  );
};

// ---------------------------------------------------------
// CREATE REQUEST
// ---------------------------------------------------------

// @route POST /api/requests
const createRequest = async (req, res) => {
  let savedDocument = null;

  try {
    const {
      bloodGroup,
      hospital,
      city,
      unitsNeeded,
      urgency,
      lat,
      lng,
    } = req.body;

    if (
      !bloodGroup ||
      !hospital ||
      !city ||
      !unitsNeeded ||
      lat === undefined ||
      lng === undefined ||
      lat === "" ||
      lng === ""
    ) {
      return res.status(400).json({
        message:
          "Blood group, hospital, city, units needed, and map location are required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message:
          "A hospital document is required to submit this request",
      });
    }

    const latitude = Number(lat);
    const longitude = Number(lng);
    const units = Number(unitsNeeded);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return res.status(400).json({
        message: "Invalid map location",
      });
    }

    if (
      !Number.isInteger(units) ||
      units < 1
    ) {
      return res.status(400).json({
        message:
          "Units needed must be at least 1",
      });
    }

    const validation =
      await validateDocument(req.file);

    if (!validation.valid) {
      return res.status(400).json({
        message: validation.message,
      });
    }

    savedDocument = await saveDocument(
      req.file,
      validation.extension
    );

    const request =
      await Request.create({
        requester: req.user._id,
        bloodGroup,
        hospital,
        city,
        unitsNeeded: units,
        urgency,
        location: {
          lat: latitude,
          lng: longitude,
        },
        verificationDocument:
          savedDocument.publicPath,
      });

    res.status(201).json({
      request,
    });
  } catch (error) {
    if (savedDocument?.absolutePath) {
      try {
        await fs.promises.unlink(
          savedDocument.absolutePath
        );
      } catch (cleanupError) {
        if (
          cleanupError.code !==
          "ENOENT"
        ) {
          console.error(
            "Failed to clean up uploaded document:",
            cleanupError
          );
        }
      }
    }

    res.status(500).json({
      message:
        "Failed to create request",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// GET OPEN REQUESTS
// ---------------------------------------------------------

// @route GET /api/requests
const getRequests = async (req, res) => {
  try {
    const {
      bloodGroup,
      city,
    } = req.query;

    const query = {
      status: "open",
    };

    if (bloodGroup) {
      query.bloodGroup =
        bloodGroup;
    }

    if (city) {
      query.city = new RegExp(
        city.trim(),
        "i"
      );
    }

    const requests =
      await Request.find(query)
        .populate(
          "requester",
          "name email"
        )
        .sort({
          createdAt: -1,
        });

    res.status(200).json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to fetch requests",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// REPORT REQUEST
// ---------------------------------------------------------

// @route PUT /api/requests/:id/report
const reportRequest = async (
  req,
  res
) => {
  try {
    const request =
      await Request.findById(
        req.params.id
      );

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    if (
      request.requester.toString() ===
      req.user._id.toString()
    ) {
      return res.status(400).json({
        message:
          "You can't report your own request",
      });
    }

    if (
      request.reportedBy.some(
        (id) =>
          id.toString() ===
          req.user._id.toString()
      )
    ) {
      return res.status(409).json({
        message:
          "You've already reported this request",
      });
    }

    request.reportedBy.push(
      req.user._id
    );

    request.reportCount += 1;

    if (
      request.reportCount >=
        Request.REPORT_THRESHOLD &&
      request.status === "open"
    ) {
      request.status = "removed";
    }

    await request.save();

    res.status(200).json({
      request,
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to report request",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// I CAN DONATE
// ---------------------------------------------------------

// @route PUT /api/requests/:id/respond
const respondToRequest = async (
  req,
  res
) => {
  try {
    const request =
      await Request.findById(
        req.params.id
      );

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    if (request.status !== "open") {
      return res.status(400).json({
        message:
          "You can only respond to an open blood request",
      });
    }

    if (
      request.requester.toString() ===
      req.user._id.toString()
    ) {
      return res.status(400).json({
        message:
          "You cannot respond to your own blood request",
      });
    }

    const donorProfile =
      await DonorProfile.findOne({
        user: req.user._id,
      });

    if (!donorProfile) {
      return res.status(400).json({
        message:
          "Complete your donor profile before offering to donate",
      });
    }

    if (!donorProfile.bloodGroup) {
      return res.status(400).json({
        message:
          "Your blood group is required before you can offer to donate",
      });
    }

    const eligible =
      isEligibleByDonationHistory(
        donorProfile.lastDonationDate
      );

    if (!eligible) {
      return res.status(400).json({
        message:
          "You are not yet eligible to donate. Donors must wait 90 days after their last donation.",
      });
    }

    const compatible =
      isBloodCompatible(
        donorProfile.bloodGroup,
        request.bloodGroup
      );

    if (!compatible) {
      return res.status(400).json({
        message:
          "Your blood group is not compatible with this request",
      });
    }

    const alreadyResponded =
      request.respondedDonors.some(
        (response) =>
          response.donor.toString() ===
          req.user._id.toString()
      );

    if (alreadyResponded) {
      return res.status(409).json({
        message:
          "You have already offered to donate for this request",
      });
    }

    request.respondedDonors.push({
      donor: req.user._id,
      respondedAt: new Date(),
    });

    await request.save();

    res.status(200).json({
      message:
        "I Can Donate response submitted successfully",

      medicalDisclaimer:
        "Final donation eligibility and transfusion compatibility must be confirmed by the blood bank or a qualified medical professional.",

      request,
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to respond to request",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// WITHDRAW I CAN DONATE
// ---------------------------------------------------------

// @route DELETE /api/requests/:id/respond
const withdrawResponse = async (
  req,
  res
) => {
  try {
    const request =
      await Request.findById(
        req.params.id
      );

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    if (request.status !== "open") {
      return res.status(400).json({
        message:
          "You cannot withdraw a response after the request is no longer open",
      });
    }

    const responseIndex =
      request.respondedDonors.findIndex(
        (response) =>
          response.donor.toString() ===
          req.user._id.toString()
      );

    if (responseIndex === -1) {
      return res.status(404).json({
        message:
          "You have not responded to this request",
      });
    }

    request.respondedDonors.splice(
      responseIndex,
      1
    );

    await request.save();

    res.status(200).json({
      message:
        "Your donation response has been withdrawn",
      request,
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to withdraw donation response",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// UPDATE REQUEST STATUS
// ---------------------------------------------------------

// @route PUT /api/requests/:id/status
const updateRequestStatus = async (
  req,
  res
) => {
  try {
    const { status } = req.body;

    if (
      ![
        "open",
        "fulfilled",
        "cancelled",
        "expired",
      ].includes(status)
    ) {
      return res.status(400).json({
        message:
          "Invalid status value",
      });
    }

    const request =
      await Request.findById(
        req.params.id
      );

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    if (
      request.requester.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message:
          "Only the requester can update this request",
      });
    }

    if (
      [
        "fulfilled",
        "cancelled",
        "expired",
        "removed",
      ].includes(request.status)
    ) {
      return res.status(400).json({
        message:
          "This request can no longer be updated",
      });
    }

    if (
      ![
        "fulfilled",
        "cancelled",
      ].includes(status)
    ) {
      return res.status(400).json({
        message:
          "An open request can only be fulfilled or cancelled",
      });
    }

    if (
      ["fulfilled", "cancelled"].includes(
        status
      ) &&
      request.verificationDocument
    ) {
      await deleteVerificationDocument(
        request.verificationDocument
      );

      request.verificationDocument =
        undefined;
    }

    request.status = status;

    await request.save();

    res.status(200).json({
      request,
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to update request",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// GET MY REQUESTS + RESPONDING DONORS
// ---------------------------------------------------------

// @route GET /api/requests/my
//
// IMPORTANT:
// Only the authenticated requester gets this endpoint.
// It returns the donors who responded to THEIR requests.
//
// Phone/email are intentionally NOT returned here.
// The frontend must open /api/donors/:id to access the
// donor's public profile, where privacy settings are enforced.
const getMyRequests = async (
  req,
  res
) => {
  try {
    const requests =
      await Request.find({
        requester: req.user._id,
      })
        .populate(
          "requester",
          "name email"
        )
        .populate(
          "respondedDonors.donor",
          "name"
        )
        .sort({
          createdAt: -1,
        });

    // ---------------------------------------------
    // Collect responding donor user IDs
    // ---------------------------------------------

    const donorUserIds = [];

    requests.forEach((request) => {
      request.respondedDonors.forEach(
        (response) => {
          if (
            response?.donor?._id
          ) {
            donorUserIds.push(
              response.donor._id
            );
          }
        }
      );
    });

    // ---------------------------------------------
    // Get donor profiles for those users
    // ---------------------------------------------

    let donorProfiles = [];

    if (donorUserIds.length > 0) {
      donorProfiles =
        await DonorProfile.find({
          user: {
            $in: donorUserIds,
          },
        }).select(
          "_id user bloodGroup city pincode lastDonationDate isAvailable"
        );
    }

    // ---------------------------------------------
    // Map user ID -> donor profile
    // ---------------------------------------------

    const profileMap = new Map();

    donorProfiles.forEach(
      (profile) => {
        profileMap.set(
          profile.user.toString(),
          profile
        );
      }
    );

    // ---------------------------------------------
    // Build safe response
    // ---------------------------------------------

    const safeRequests =
      requests.map((request) => {
        const requestObject =
          request.toObject();

        requestObject.respondedDonors =
          request.respondedDonors.map(
            (response) => {
              const donorUser =
                response.donor;

              if (!donorUser) {
                return null;
              }

              const donorProfile =
                profileMap.get(
                  donorUser._id.toString()
                );

              return {
                donor: {
                  _id: donorUser._id,
                  name: donorUser.name,

                  donorProfileId:
                    donorProfile?._id ||
                    null,

                  bloodGroup:
                    donorProfile?.bloodGroup ||
                    null,

                  city:
                    donorProfile?.city ||
                    null,

                  pincode:
                    donorProfile?.pincode ||
                    "",

                  lastDonationDate:
                    donorProfile?.lastDonationDate ||
                    null,

                  isAvailable:
                    donorProfile
                      ? donorProfile.isAvailable
                      : false,
                },

                respondedAt:
                  response.respondedAt,
              };
            }
          );

        requestObject.respondedDonors =
          requestObject.respondedDonors.filter(
            Boolean
          );

        return requestObject;
      });

    res.status(200).json({
      count: safeRequests.length,
      requests: safeRequests,
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to fetch your requests",
      error: error.message,
    });
  }
};

// ---------------------------------------------------------
// DELETE FINISHED REQUEST
// ---------------------------------------------------------

// @route DELETE /api/requests/:id
const deleteRequest = async (
  req,
  res
) => {
  try {
    const request =
      await Request.findById(
        req.params.id
      );

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    if (
      request.requester.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message:
          "Only the requester can delete this request",
      });
    }

    if (request.status === "open") {
      return res.status(400).json({
        message:
          "Open requests cannot be deleted. Cancel or fulfill the request first.",
      });
    }

    if (request.verificationDocument) {
      await deleteVerificationDocument(
        request.verificationDocument
      );
    }

    await request.deleteOne();

    res.status(200).json({
      message:
        "Request deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message:
        "Failed to delete request",
      error: error.message,
    });
  }
};

module.exports = {
  createRequest,
  getRequests,
  getMyRequests,
  respondToRequest,
  withdrawResponse,
  updateRequestStatus,
  deleteRequest,
  reportRequest,
};