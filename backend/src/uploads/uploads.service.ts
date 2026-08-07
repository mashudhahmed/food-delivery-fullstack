// src/uploads/uploads.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CloudinaryService, CloudinaryUploadResult } from '../cloudinary/cloudinary.service';
import { Express } from 'express';
import { ImageValidatorService } from '../common/services/image-validator.service';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private cloudinaryService: CloudinaryService,
    private imageValidator: ImageValidatorService,
  ) {}

  async uploadRestaurantImage(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    await this.imageValidator.validateImage(file);
    const sanitizedBuffer = await this.imageValidator.sanitizeImage(file);
    const sanitizedFile = {
      ...file,
      buffer: sanitizedBuffer,
    };

    return this.cloudinaryService.uploadRestaurantImage(sanitizedFile);
  }

  async uploadMenuItemImage(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    await this.imageValidator.validateImage(file);
    const sanitizedBuffer = await this.imageValidator.sanitizeImage(file);
    const sanitizedFile = {
      ...file,
      buffer: sanitizedBuffer,
    };

    return this.cloudinaryService.uploadMenuItemImage(sanitizedFile);
  }

  async uploadProfileImage(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    await this.imageValidator.validateImage(file);
    const sanitizedBuffer = await this.imageValidator.sanitizeImage(file);
    const sanitizedFile = {
      ...file,
      buffer: sanitizedBuffer,
    };

    return this.cloudinaryService.uploadProfileImage(sanitizedFile);
  }

  async uploadGeneralImage(file: Express.Multer.File, folder: string = 'general'): Promise<CloudinaryUploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    await this.imageValidator.validateImage(file);
    const sanitizedBuffer = await this.imageValidator.sanitizeImage(file);
    const sanitizedFile = {
      ...file,
      buffer: sanitizedBuffer,
    };

    return this.cloudinaryService.uploadImage(sanitizedFile, folder);
  }

  async deleteFile(publicId: string): Promise<{ success: boolean }> {
    const result = await this.cloudinaryService.deleteFile(publicId);
    return { success: result };
  }

  getOptimizedImageUrl(publicId: string, options?: {
    width?: number;
    height?: number;
    quality?: string;
  }): string {
    return this.cloudinaryService.getOptimizedUrl(publicId, options);
  }

  getResponsiveImages(publicId: string): { srcSet: string; sizes: string } {
    return this.cloudinaryService.getResponsiveUrls(publicId);
  }
}