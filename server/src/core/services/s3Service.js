import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../../shared/utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class S3Service {
  constructor() {
    this.storageType = process.env.REPORTS_STORAGE_TYPE || 'local';
    this.localPath = process.env.REPORTS_LOCAL_PATH || path.join(__dirname, '../public/reports');
    
    if (this.storageType === 's3') {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });
      this.bucketName = process.env.S3_BUCKET_NAME;
      this.prefix = process.env.S3_REPORTS_PREFIX || 'reports/';
    } else {
      if (!fs.existsSync(this.localPath)) {
        fs.mkdirSync(this.localPath, { recursive: true });
      }
    }
    
    logger.info({ storageType: this.storageType }, 'S3Service initialized');
  }

  async uploadFile(buffer, key, contentType = 'application/pdf', metadata = {}) {
    try {
      if (this.storageType === 's3') {
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: `${this.prefix}${key}`,
          Body: buffer,
          ContentType: contentType,
          Metadata: metadata,
        });

        await this.s3Client.send(command);
        
        logger.info({ key, size: buffer.length }, 'File uploaded to S3');
        
        return {
          key: `${this.prefix}${key}`,
          size: buffer.length,
          url: await this.getSignedUrl(key),
        };
      } else {
        const filePath = path.join(this.localPath, key);
        const dir = path.dirname(filePath);
        
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, buffer);
        
        logger.info({ key, size: buffer.length }, 'File saved locally');
        
        return {
          key,
          size: buffer.length,
          url: `/reports/${key}`,
        };
      }
    } catch (error) {
      logger.error({ error, key }, 'Failed to upload file');
      throw error;
    }
  }

  async getSignedUrl(key, expiresIn = 3600) {
    try {
      if (this.storageType === 's3') {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: `${this.prefix}${key}`,
        });

        const url = await getSignedUrl(this.s3Client, command, { expiresIn });
        return url;
      } else {
        return `/reports/${key}`;
      }
    } catch (error) {
      logger.error({ error, key }, 'Failed to generate signed URL');
      throw error;
    }
  }

  async deleteFile(key) {
    try {
      if (this.storageType === 's3') {
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: `${this.prefix}${key}`,
        });

        await this.s3Client.send(command);
        logger.info({ key }, 'File deleted from S3');
      } else {
        const filePath = path.join(this.localPath, key);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          logger.info({ key }, 'File deleted locally');
        }
      }
    } catch (error) {
      logger.error({ error, key }, 'Failed to delete file');
      throw error;
    }
  }

  async fileExists(key) {
    try {
      if (this.storageType === 's3') {
        const command = new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: `${this.prefix}${key}`,
        });

        await this.s3Client.send(command);
        return true;
      } else {
        const filePath = path.join(this.localPath, key);
        return fs.existsSync(filePath);
      }
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      logger.error({ error, key }, 'Failed to check file existence');
      throw error;
    }
  }

  async getFileBuffer(key) {
    try {
      if (this.storageType === 's3') {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: `${this.prefix}${key}`,
        });

        const response = await this.s3Client.send(command);
        const chunks = [];
        
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        
        return Buffer.concat(chunks);
      } else {
        const filePath = path.join(this.localPath, key);
        return fs.readFileSync(filePath);
      }
    } catch (error) {
      logger.error({ error, key }, 'Failed to get file buffer');
      throw error;
    }
  }
}

export const s3Service = new S3Service();
