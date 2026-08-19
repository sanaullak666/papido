const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads/documents');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedField = (req.body.documentType || file.fieldname || 'doc').replace(/[^a-zA-Z0-9_-]/g, '');
    cb(null, `${sanitizedField}-${uniqueSuffix}${ext}`);
  }
});

// File Filter: Allow Images (JPG, PNG, WEBP) and PDFs up to 1MB
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
    'application/pdf'
  ];

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only JPG, PNG, WEBP images and PDF documents are allowed.'), false);
  }
};

// 5MB Maximum File Size Limit for crisp high-res ID documents & profile photos
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5 Megabytes
  }
});

module.exports = upload;
