const multer = require('multer');
const path = require('path');
const AppError = require('../utils/appError');

// 1. Configure Storage Destination & Unique Naming
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Store in the root uploads folder
  },
  filename: (req, file, cb) => {
    // Generate safe filename structure: student-[id]-[timestamp].[ext]
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `student-${req.params.id || 'temp'}-${uniqueSuffix}${ext}`);
  }
});

// 2. Validate File Format Extensions & Mimetypes
const fileFilter = (req, file, cb) => {
  const allowedExtensions = /jpeg|jpg|png/;
  const extName = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimeType = allowedExtensions.test(file.mimetype);

  if (extName && mimeType) {
    return cb(null, true);
  }
  cb(new AppError('Only image files (.jpg, .jpeg, .png) are allowed.', 400), false);
};

// 3. Initialize Multer Configuration
const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Enforce 2MB maximum limit
  fileFilter: fileFilter
});

module.exports = upload;