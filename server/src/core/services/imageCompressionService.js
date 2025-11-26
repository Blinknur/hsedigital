import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { logger } from '../../shared/utils/logger.js';

const IMAGE_SIZES = {
  thumbnail: { width: 150, height: 150, quality: 70 },
  mobile: { width: 800, height: 800, quality: 75 },
  original: { quality: 85 }
};

export class ImageCompressionService {
  async compressImage(inputPath, outputPath, size = 'mobile') {
    try {
      const config = IMAGE_SIZES[size] || IMAGE_SIZES.mobile;
      
      const sharpInstance = sharp(inputPath);
      
      if (config.width && config.height) {
        sharpInstance.resize(config.width, config.height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
      
      const metadata = await sharp(inputPath).metadata();
      
      if (metadata.format === 'png') {
        await sharpInstance
          .png({ quality: config.quality, compressionLevel: 9 })
          .toFile(outputPath);
      } else {
        await sharpInstance
          .jpeg({ quality: config.quality, progressive: true })
          .toFile(outputPath);
      }
      
      const inputStats = fs.statSync(inputPath);
      const outputStats = fs.statSync(outputPath);
      const compressionRatio = ((1 - outputStats.size / inputStats.size) * 100).toFixed(2);
      
      logger.info({
        inputSize: inputStats.size,
        outputSize: outputStats.size,
        compressionRatio: `${compressionRatio}%`,
        size
      }, 'Image compressed successfully');
      
      return {
        path: outputPath,
        originalSize: inputStats.size,
        compressedSize: outputStats.size,
        compressionRatio
      };
    } catch (error) {
      logger.error({ error, inputPath, outputPath }, 'Image compression failed');
      throw error;
    }
  }

  async compressMultipleSizes(inputPath, baseOutputPath) {
    const results = {};
    const ext = path.extname(baseOutputPath);
    const baseName = path.basename(baseOutputPath, ext);
    const dir = path.dirname(baseOutputPath);
    
    for (const [sizeName, config] of Object.entries(IMAGE_SIZES)) {
      const outputPath = path.join(dir, `${baseName}_${sizeName}${ext}`);
      results[sizeName] = await this.compressImage(inputPath, outputPath, sizeName);
    }
    
    return results;
  }

  async compressBuffer(buffer, options = {}) {
    try {
      const { width = 800, height = 800, quality = 75, format = 'jpeg' } = options;
      
      const sharpInstance = sharp(buffer)
        .resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      
      if (format === 'png') {
        return await sharpInstance.png({ quality, compressionLevel: 9 }).toBuffer();
      } else {
        return await sharpInstance.jpeg({ quality, progressive: true }).toBuffer();
      }
    } catch (error) {
      logger.error({ error }, 'Buffer compression failed');
      throw error;
    }
  }
}

export const imageCompressionService = new ImageCompressionService();
