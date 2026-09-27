const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const { verifyToken } = require('../middleware/auth.middleware');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { success, error } = require('../utils/response');

// File upload endpoint (rate limited and file signature verified)
router.post('/file', uploadLimiter, (req, res) => {
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

    const fs = require('fs');

    // Verify file magic bytes / signature to block polyglot & MIME spoofing attacks
    try {
      const header = Buffer.alloc(8);
      const fd = fs.openSync(req.file.path, 'r');
      fs.readSync(fd, header, 0, 8, 0);
      fs.closeSync(fd);

      const isJpeg = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
      const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
      const isPdf = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
      const isWebp = header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46;

      if (!isJpeg && !isPng && !isPdf && !isWebp) {
        try { fs.unlinkSync(req.file.path); } catch (_) {}
        return error(res, 'Invalid file signature. Only valid JPG, PNG, WEBP, and PDF documents are allowed.', 400);
      }
    } catch (sigErr) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
      return error(res, 'Failed to verify file integrity.', 400);
    }

    const requestedMaxKb = parseInt(req.query.maxKb || req.query.maxSizeKb, 10);
    if (requestedMaxKb && req.file.size > requestedMaxKb * 1024) {
      try {
        if (req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
      } catch (_) {}
      return error(res, `File size (${(req.file.size / 1024).toFixed(1)} KB) exceeds the ${requestedMaxKb} KB limit. Please upload a file smaller than ${requestedMaxKb} KB.`, 400);
    }
    const host = req.get('host');
    const protocol = req.protocol;
    const fileUrl = `${protocol}://${host}/uploads/documents/${req.file.filename}`;

    let dataUri = null;
    try {
      if (req.file.size <= 2.5 * 1024 * 1024) {
        const fileData = fs.readFileSync(req.file.path);
        dataUri = `data:${req.file.mimetype};base64,${fileData.toString('base64')}`;
      }
    } catch (_) {}

    return success(res, 'File uploaded successfully.', {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: dataUri || fileUrl,
      dataUri,
      fileUrl,
      relativePath: `/uploads/documents/${req.file.filename}`
    }, 201);
  });
});

module.exports = router;
