const fs = require('fs');
const path = require('path');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const env = require('../config/environment');
const logger = require('../utils/logger');

class StorageService {
  constructor() {
    this.s3Client = null;
    this.provider = env.STORAGE.PROVIDER;
    this.bucket = '';
    this.publicUrl = '';

    this.initializeClient();
  }

  initializeClient() {
    try {
      if (this.provider === 'r2' && env.STORAGE.R2.ACCESS_KEY_ID && env.STORAGE.R2.SECRET_ACCESS_KEY) {
        this.bucket = env.STORAGE.R2.BUCKET_NAME;
        this.publicUrl = env.STORAGE.R2.PUBLIC_URL;
        const endpoint = env.STORAGE.R2.ENDPOINT;

        this.s3Client = new S3Client({
          region: 'auto',
          endpoint: endpoint,
          credentials: {
            accessKeyId: env.STORAGE.R2.ACCESS_KEY_ID,
            secretAccessKey: env.STORAGE.R2.SECRET_ACCESS_KEY
          }
        });
        logger.info(`[StorageService] Initialized Cloudflare R2 Object Storage (Bucket: ${this.bucket})`);
      } else if (this.provider === 's3' && env.STORAGE.S3.ACCESS_KEY_ID && env.STORAGE.S3.SECRET_ACCESS_KEY) {
        this.bucket = env.STORAGE.S3.BUCKET_NAME;
        this.publicUrl = env.STORAGE.S3.PUBLIC_URL;

        this.s3Client = new S3Client({
          region: env.STORAGE.S3.REGION,
          credentials: {
            accessKeyId: env.STORAGE.S3.ACCESS_KEY_ID,
            secretAccessKey: env.STORAGE.S3.SECRET_ACCESS_KEY
          }
        });
        logger.info(`[StorageService] Initialized AWS S3 Object Storage (Bucket: ${this.bucket}, Region: ${env.STORAGE.S3.REGION})`);
      } else {
        this.provider = 'local';
        logger.info('[StorageService] Operating in Local Storage mode (R2/S3 credentials not configured).');
      }
    } catch (err) {
      logger.warn(`[StorageService] Failed to initialize cloud storage client: ${err.message}. Falling back to local storage.`);
      this.provider = 'local';
      this.s3Client = null;
    }
  }

  isCloudConfigured() {
    return Boolean(this.s3Client && (this.provider === 'r2' || this.provider === 's3'));
  }

  /**
   * Upload a file buffer or stream to cloud storage (or fallback to local disk)
   */
  async uploadFile({ buffer, filename, mimetype, folder = 'documents', localFilePath = null }) {
    const key = `${folder}/${filename}`;

    // If cloud storage (Cloudflare R2 or AWS S3) is active
    if (this.isCloudConfigured()) {
      try {
        const fileBuffer = buffer || (localFilePath ? fs.readFileSync(localFilePath) : null);
        if (!fileBuffer) {
          throw new Error('No file buffer or valid local file path provided for upload.');
        }

        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: fileBuffer,
          ContentType: mimetype
        });

        await this.s3Client.send(command);

        // Build public URL
        let fileUrl = '';
        if (this.publicUrl) {
          const baseUrl = this.publicUrl.replace(/\/+$/, '');
          fileUrl = `${baseUrl}/${key}`;
        } else if (this.provider === 'r2' && env.STORAGE.R2.ACCOUNT_ID) {
          fileUrl = `https://${this.bucket}.${env.STORAGE.R2.ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
        } else {
          fileUrl = `https://${this.bucket}.s3.${env.STORAGE.S3.REGION}.amazonaws.com/${key}`;
        }

        logger.info(`[StorageService] File uploaded successfully to ${this.provider.toUpperCase()}: ${key}`);

        return {
          success: true,
          provider: this.provider,
          key,
          url: fileUrl,
          fileUrl
        };
      } catch (cloudErr) {
        logger.warn(`[StorageService] Cloud upload to ${this.provider} failed: ${cloudErr.message}. Falling back to local disk.`);
      }
    }

    // Local Disk Storage Fallback
    try {
      const targetDir = path.join(__dirname, '../../uploads', folder);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const destPath = path.join(targetDir, filename);

      // If localFilePath already exists and is where multer put it, we can keep it
      if (localFilePath && fs.existsSync(localFilePath) && localFilePath !== destPath) {
        fs.copyFileSync(localFilePath, destPath);
      } else if (buffer) {
        fs.writeFileSync(destPath, buffer);
      }

      const relativePath = `/uploads/${folder}/${filename}`;

      return {
        success: true,
        provider: 'local',
        key: `${folder}/${filename}`,
        relativePath,
        fileUrl: relativePath,
        url: relativePath
      };
    } catch (localErr) {
      logger.error(`[StorageService] Local disk write failed: ${localErr.message}`);
      throw localErr;
    }
  }
}

module.exports = new StorageService();
