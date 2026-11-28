const express = require('express');
const fs = require('fs');
const router = express.Router();
const upload = require('../middleware/upload.middleware');
const { verifyToken } = require('../middleware/auth.middleware');
const { uploadLimiter } = require('../middleware/rateLimiter');
const { success, error } = require('../utils/response');
const storageService = require('../services/storage.service');
const SettingsModel = require('../models/settings.model');

function hasValidDocumentSignature(filePath) {
  const header = Buffer.alloc(12);
  const fd = fs.openSync(filePath, 'r');
  try {
    const bytesRead = fs.readSync(fd, header, 0, 12, 0);
    if (bytesRead < 4) return false;
  } finally {
    fs.closeSync(fd);
  }

  const isJpeg = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
  const isPng = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
  const isPdf = header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
  const isWebp =
    header.subarray(0, 4).toString('ascii') === 'RIFF' &&
    header.subarray(8, 12).toString('ascii') === 'WEBP';

  return isJpeg || isPng || isPdf || isWebp;
}

function removeTempFile(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (_) {}
}

function handleUploadRequest(req, res, { hardMaxKb = null } = {}) {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return error(res, 'File size exceeds the 5MB limit. Please upload a file smaller than 5MB.', 400);
      }
      return error(res, err.message || 'File upload failed.', 400);
    }

    if (!req.file) {
      return error(res, 'No file was uploaded.', 400);
    }

    // Verify file magic bytes / signature to block polyglot & MIME spoofing attacks
    try {
      if (!hasValidDocumentSignature(req.file.path)) {
        removeTempFile(req.file.path);
        return error(res, 'Invalid file signature. Only valid JPG, PNG, WEBP, and PDF documents are allowed.', 400);
      }
    } catch (_) {
      removeTempFile(req.file.path);
      return error(res, 'Failed to verify file integrity.', 400);
    }

    const requestedMaxKb = parseInt(req.query.maxKb || req.query.maxSizeKb, 10);
    const effectiveMaxKb = hardMaxKb
      ? (requestedMaxKb ? Math.min(requestedMaxKb, hardMaxKb) : hardMaxKb)
      : requestedMaxKb;

    if (effectiveMaxKb && req.file.size > effectiveMaxKb * 1024) {
      removeTempFile(req.file.path);
      return error(res, `File size (${(req.file.size / 1024).toFixed(1)} KB) exceeds the ${effectiveMaxKb} KB limit. Please upload a file smaller than ${effectiveMaxKb} KB.`, 400);
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const defaultLocalUrl = `${protocol}://${host}/uploads/documents/${req.file.filename}`;

    let dataUri = null;
    try {
      if (req.file.size <= 2.5 * 1024 * 1024) {
        const fileData = fs.readFileSync(req.file.path);
        dataUri = `data:${req.file.mimetype};base64,${fileData.toString('base64')}`;
      }
    } catch (_) {}

    let storageResult = null;
    try {
      storageResult = await storageService.uploadFile({
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        folder: 'documents',
        localFilePath: req.file.path
      });
    } catch (storeErr) {
      console.warn('[Upload Route] Storage upload notice:', storeErr.message);
    }

    const finalUrl = (storageResult && storageResult.url) || dataUri || defaultLocalUrl;

    return success(res, 'File uploaded successfully.', {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      provider: (storageResult && storageResult.provider) || 'local',
      url: finalUrl,
      fileUrl: (storageResult && storageResult.fileUrl) || defaultLocalUrl,
      dataUri,
      relativePath: `/uploads/documents/${req.file.filename}`
    }, 201);
  });
}

// Authenticated file upload endpoint (KYC updates, profile uploads)
router.post('/file', verifyToken, uploadLimiter, (req, res) => {
  return handleUploadRequest(req, res);
});

// Registration KYC upload endpoint (only active when rider registration is enabled, capped at 250 KB)
router.post('/registration-doc', uploadLimiter, async (req, res) => {
  try {
    const isWeb = req.headers['x-client-platform'] === 'web' || Boolean(req.headers.origin || req.headers.referer);
    const regCheck = await SettingsModel.checkRegistrationAllowed({ role: 'RIDER', isWeb });
    if (!regCheck.allowed) {
      return error(res, regCheck.message, 403);
    }
  } catch (_) {}
  return handleUploadRequest(req, res, { hardMaxKb: 250 });
});

module.exports = router;
