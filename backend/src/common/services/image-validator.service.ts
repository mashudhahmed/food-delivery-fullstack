import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import sharp from 'sharp';
import * as path from 'path';

@Injectable()
export class ImageValidatorService {
  private readonly logger = new Logger(ImageValidatorService.name);
  private readonly MAX_DIMENSIONS = {
    width: 4096,
    height: 4096,
  };
  private readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ];
  private readonly ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

  async validateImage(file: Express.Multer.File): Promise<boolean> {
    try {
      // Check file size
      if (file.size > this.MAX_FILE_SIZE) {
        throw new BadRequestException(
          `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds ${this.MAX_FILE_SIZE / 1024 / 1024}MB limit`,
        );
      }

      // Check file type
      if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(`Unsupported MIME type: ${file.mimetype}`);
      }

      // Check file extension
      const ext = path.extname(file.originalname).toLowerCase();
      if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
        throw new BadRequestException(`Unsupported file extension: ${ext}`);
      }

      // For SVG, check for malicious content
      if (file.mimetype === 'image/svg+xml') {
        await this.validateSvg(file);
        return true;
      }

      // For other images, validate with Sharp
      await this.validateImageContent(file);
      return true;
    } catch (error) {
      this.logger.error(`Image validation failed: ${error.message}`);
      throw error;
    }
  }

  private async validateImageContent(file: Express.Multer.File): Promise<void> {
    try {
      const image = sharp(file.buffer);
      const metadata = await image.metadata();

      // Check if image has valid dimensions
      if (!metadata.width || !metadata.height) {
        throw new BadRequestException('Invalid image: cannot read dimensions');
      }

      // Check max dimensions
      if (
        metadata.width > this.MAX_DIMENSIONS.width ||
        metadata.height > this.MAX_DIMENSIONS.height
      ) {
        throw new BadRequestException(
          `Image too large: ${metadata.width}x${metadata.height} exceeds ${this.MAX_DIMENSIONS.width}x${this.MAX_DIMENSIONS.height}`,
        );
      }

      // Check if image is corrupted
      try {
        await image.toBuffer({ resolveWithObject: true });
      } catch (error) {
        throw new BadRequestException('Corrupted or invalid image file');
      }

      // Check for excessive file size after compression (avoid DoS)
      if (file.size > this.MAX_FILE_SIZE) {
        throw new BadRequestException('Image exceeds maximum allowed size');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Invalid image file: ${error.message}`);
    }
  }

  private async validateSvg(file: Express.Multer.File): Promise<void> {
    const content = file.buffer.toString('utf-8');
    const lowerContent = content.toLowerCase();

    // Check for common SVG injection patterns
    const maliciousPatterns = [
      /<script/i,
      /onload=/i,
      /onerror=/i,
      /onclick=/i,
      /onmouseover=/i,
      /javascript:/i,
      /data:text\/html/i,
      /<foreignobject/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<link/i,
      /import/i,
      /include/i,
    ];

    for (const pattern of maliciousPatterns) {
      if (pattern.test(lowerContent)) {
        throw new BadRequestException('SVG contains potentially malicious content');
      }
    }

    // Check SVG structure (basic validation)
    if (!content.includes('<svg') || !content.includes('</svg>')) {
      throw new BadRequestException('Invalid SVG format');
    }

    // Check for excessive size (SVG DoS)
    if (content.length > 1024 * 1024) {
      throw new BadRequestException('SVG file too large');
    }

    // Check for excessive nested elements (potential DoS)
    const depth = this.calculateSvgDepth(content);
    if (depth > 20) {
      throw new BadRequestException('SVG has excessive nesting depth');
    }
  }

  private calculateSvgDepth(content: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    const stack: string[] = [];

    // Simple depth calculation
    const openTags = content.match(/<[^/][^>]*>/g) || [];
    const closeTags = content.match(/<\/[^>]+>/g) || [];

    let openIndex = 0;
    let closeIndex = 0;

    while (openIndex < openTags.length || closeIndex < closeTags.length) {
      if (openIndex < openTags.length && 
          (closeIndex >= closeTags.length || 
           openTags[openIndex].indexOf('<') < closeTags[closeIndex].indexOf('</'))) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
        openIndex++;
      } else {
        currentDepth--;
        closeIndex++;
      }
    }

    return maxDepth;
  }

  async sanitizeImage(file: Express.Multer.File): Promise<Buffer> {
    try {
      // Re-encode image to strip metadata and potential malware
      const image = sharp(file.buffer);
      const metadata = await image.metadata();

      let sanitized = image;
      
      // Convert to safe format if needed
      if (metadata.format === 'svg') {
        // SVG requires special handling - we'll just validate
        return file.buffer;
      }

      // Resize if too large
      if (metadata.width && metadata.width > 2048) {
        sanitized = sanitized.resize(2048, null, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Re-encode with safe settings
      const result = await sanitized
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();

      return result;
    } catch (error) {
      this.logger.error(`Image sanitization failed: ${error.message}`);
      return file.buffer; // Return original as fallback
    }
  }
}