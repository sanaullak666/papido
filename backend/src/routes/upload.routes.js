const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const { verifyToken } = require('../middleware/auth.middleware');
const { success, error } = require('../utils/response');

// File upload endpoint (supports both unauthenticated registration uploads and authenticated document updates)
router.post('/file', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return error(res, 'File size exceeds the 5MB limit. Please upload a file smaller than 5MB.', 400);
      }
      return error(res, err.message || 'File upload failed.', 400);
    }

    if (!req.file) {
      return error(res, 'No file was uploaded.', 400);
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/documents/${req.file.filename}`;

    return success(res, 'File uploaded successfully.', {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: fileUrl,
      relativePath: `/uploads/documents/${req.file.filename}`
    }, 201);
  });
});

module.exports = router;
