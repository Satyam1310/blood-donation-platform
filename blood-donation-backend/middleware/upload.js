const multer = require("multer");
const path = require("path");

// Keep uploaded files in memory first.
// requestController.js will inspect the actual file contents
// before saving an approved document to disk.
const storage = multer.memoryStorage();

const allowedExtensions = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".docx",
];

const allowedMimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();

  // First check the filename extension.
  if (!allowedExtensions.includes(extension)) {
    return cb(
      new Error(
        "Only PDF, DOCX, JPG, JPEG, or PNG files are allowed for verification documents"
      )
    );
  }

  // Basic MIME check from the upload.
  // The controller performs the stronger file-signature check.
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(
      new Error(
        "Invalid document type. Only PDF, DOCX, JPG, JPEG, or PNG files are allowed"
      )
    );
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,

  limits: {
    // Maximum document size: 5 MB
    fileSize: 5 * 1024 * 1024,

    // Only one verification document per request
    files: 1,
  },
});

module.exports = upload;