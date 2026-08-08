const Request = require("../models/Request");
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
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    extensions: [".docx"],
    saveExtension: ".docx",
  },
};

// Validate the actual bytes of the uploaded file.
const validateDocument = async (file) => {
  if (!file?.buffer) {
    return {
      valid: false,
      message: "No document data received",
    };
  }

  const { fileTypeFromBuffer } = await import("file-type");
  const detectedType = await fileTypeFromBuffer(file.buffer);

  if (!detectedType) {
    return {
      valid: false,
      message: "Unable to verify the actual document type",
    };
  }

  const allowedType = ALLOWED_FILE_TYPES[detectedType.mime];

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

  if (!allowedType.extensions.includes(originalExtension)) {
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

// Save only after the file has passed validation.
const saveDocument = async (file, extension) => {
  const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const absolutePath = path.join(uploadDir, filename);

  await fs.promises.writeFile(absolutePath, file.buffer);

  return {
    filename,
    absolutePath,
    publicPath: `/uploads/verification-docs/${filename}`,
  };
};

// Delete a verification document safely.
const deleteVerificationDocument = async (documentPath) => {
  if (!documentPath) return;

  const filename = path.basename(documentPath);
  const absolutePath = path.join(uploadDir, filename);

  try {
    await fs.promises.unlink(absolutePath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
};

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

    if (!Number.isInteger(units) || units < 1) {
      return res.status(400).json({
        message: "Units needed must be at least 1",
      });
    }

    const validation = await validateDocument(req.file);

    if (!validation.valid) {
      return res.status(400).json({
        message: validation.message,
      });
    }

    savedDocument = await saveDocument(
      req.file,
      validation.extension
    );

    const request = await Request.create({
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
      verificationDocument: savedDocument.publicPath,
    });

    res.status(201).json({ request });
  } catch (error) {
    if (savedDocument?.absolutePath) {
      try {
        await fs.promises.unlink(savedDocument.absolutePath);
      } catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") {
          console.error(
            "Failed to clean up uploaded document:",
            cleanupError
          );
        }
      }
    }

    res.status(500).json({
      message: "Failed to create request",
      error: error.message,
    });
  }
};

// @route GET /api/requests
// Public/active request listing.
// Only OPEN requests are returned.
const getRequests = async (req, res) => {
  try {
    const { bloodGroup, city } = req.query;

    const query = {
      status: "open",
    };

    if (bloodGroup) {
      query.bloodGroup = bloodGroup;
    }

    if (city) {
      query.city = new RegExp(city.trim(), "i");
    }

    const requests = await Request.find(query)
      .populate("requester", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch requests",
      error: error.message,
    });
  }
};

// @route PUT /api/requests/:id/report
const reportRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

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
        message: "You can't report your own request",
      });
    }

    if (
      request.reportedBy.some(
        (id) =>
          id.toString() === req.user._id.toString()
      )
    ) {
      return res.status(409).json({
        message: "You've already reported this request",
      });
    }

    request.reportedBy.push(req.user._id);
    request.reportCount += 1;

    if (
      request.reportCount >= Request.REPORT_THRESHOLD &&
      request.status === "open"
    ) {
      request.status = "removed";
    }

    await request.save();

    res.status(200).json({ request });
  } catch (error) {
    res.status(500).json({
      message: "Failed to report request",
      error: error.message,
    });
  }
};

// @route PUT /api/requests/:id/respond
const respondToRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    if (request.status !== "open") {
      return res.status(400).json({
        message: "This request is no longer open",
      });
    }

    const alreadyResponded =
      request.respondedDonors.some(
        (id) =>
          id.toString() === req.user._id.toString()
      );

    if (!alreadyResponded) {
      request.respondedDonors.push(req.user._id);
      await request.save();
    }

    res.status(200).json({ request });
  } catch (error) {
    res.status(500).json({
      message: "Failed to respond to request",
      error: error.message,
    });
  }
};

// @route PUT /api/requests/:id/status
const updateRequestStatus = async (req, res) => {
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
        message: "Invalid status value",
      });
    }

    const request = await Request.findById(req.params.id);

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

    // A completed request cannot be reopened.
    if (
      ["fulfilled", "cancelled", "expired", "removed"].includes(
        request.status
      )
    ) {
      return res.status(400).json({
        message:
          "This request can no longer be updated",
      });
    }

    // Only an open request can be changed to fulfilled
    // or cancelled.
    if (!["fulfilled", "cancelled"].includes(status)) {
      return res.status(400).json({
        message:
          "An open request can only be fulfilled or cancelled",
      });
    }

    // When fulfilled/cancelled, remove the sensitive
    // hospital document from disk.
    if (
      ["fulfilled", "cancelled"].includes(status) &&
      request.verificationDocument
    ) {
      await deleteVerificationDocument(
        request.verificationDocument
      );

      request.verificationDocument = undefined;
    }

    request.status = status;

    await request.save();

    res.status(200).json({ request });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update request",
      error: error.message,
    });
  }
};

// @route GET /api/requests/my
// Returns only requests created by the currently logged-in user.
const getMyRequests = async (req, res) => {
  try {
    const requests = await Request.find({
      requester: req.user._id,
    })
      .populate("requester", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch your requests",
      error: error.message,
    });
  }
};

// @route DELETE /api/requests/:id
// Only the owner can delete a finished request.
const deleteRequest = async (req, res) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        message: "Request not found",
      });
    }

    // Only the requester who created the request can delete it.
    if (
      request.requester.toString() !==
      req.user._id.toString()
    ) {
      return res.status(403).json({
        message:
          "Only the requester can delete this request",
      });
    }

    // Active requests cannot be deleted.
    if (request.status === "open") {
      return res.status(400).json({
        message:
          "Open requests cannot be deleted. Cancel or fulfill the request first.",
      });
    }

    // If a document somehow still exists for a finished
    // request, clean it up before deleting the database record.
    if (request.verificationDocument) {
      await deleteVerificationDocument(
        request.verificationDocument
      );
    }

    await request.deleteOne();

    res.status(200).json({
      message: "Request deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete request",
      error: error.message,
    });
  }
};

module.exports = {
  createRequest,
  getRequests,
  getMyRequests,
  respondToRequest,
  updateRequestStatus,
  deleteRequest,
  reportRequest,
};