// src/cloudinary/cloudinary.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';
import * as stream from 'stream';
import { Express } from 'express';

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  originalName: string;
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'general',
    options?: UploadApiOptions,
  ): Promise<CloudinaryUploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    try {
      const result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `quickbite/${folder}`,
            resource_type: 'auto',
            ...options,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        const bufferStream = new stream.PassThrough();
        bufferStream.end(file.buffer);
        bufferStream.pipe(uploadStream);
      });

      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes,
        originalName: file.originalname,
      };
    } catch (error) {
      this.logger.error('Cloudinary upload failed:', error);
      throw new BadRequestException(`File upload failed: ${error.message || 'Unknown error'}`);
    }
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'images',
    options?: UploadApiOptions,
  ): Promise<CloudinaryUploadResult> {
    return this.uploadFile(file, folder, {
      resource_type: 'image',
      transformation: [
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
      ...options,
    });
  }

  async uploadRestaurantImage(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    return this.uploadImage(file, 'restaurants', {
      transformation: [
        { width: 800, height: 600, crop: 'fill' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    });
  }

  async uploadMenuItemImage(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    return this.uploadImage(file, 'menu-items', {
      transformation: [
        { width: 500, height: 500, crop: 'fill' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    });
  }

  async uploadProfileImage(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    return this.uploadImage(file, 'profiles', {
      transformation: [
        { width: 200, height: 200, crop: 'fill', radius: 'max' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    });
  }

  async deleteFile(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      this.logger.error('Cloudinary delete failed:', error);
      return false;
    }
  }

  getOptimizedUrl(publicId: string, options?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string;
    format?: string;
  }): string {
    const transformations: any = {
      quality: options?.quality || 'auto',
      fetch_format: options?.format || 'auto',
    };

    if (options?.width || options?.height) {
      transformations.width = options.width;
      transformations.height = options.height;
      transformations.crop = options.crop || 'fill';
    }

    return cloudinary.url(publicId, {
      secure: true,
      transformation: transformations,
    });
  }

  getResponsiveUrls(publicId: string, widths: number[] = [300, 600, 900, 1200]): {
    srcSet: string;
    sizes: string;
  } {
    const srcSet = widths
      .map(width => {
        const url = this.getOptimizedUrl(publicId, { width, quality: 'auto' });
        return `${url} ${width}w`;
      })
      .join(', ');

    const sizes = '(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 33vw';

    return { srcSet, sizes };
  }
}