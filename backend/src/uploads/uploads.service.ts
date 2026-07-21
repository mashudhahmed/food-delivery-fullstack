import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { CloudinaryService, CloudinaryUploadResult } from '../cloudinary/cloudinary.service';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(private cloudinaryService: CloudinaryService) {}

  async uploadRestaurantImage(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.cloudinaryService.uploadRestaurantImage(file);
  }

  async uploadMenuItemImage(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.cloudinaryService.uploadMenuItemImage(file);
  }

  async uploadProfileImage(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.cloudinaryService.uploadProfileImage(file);
  }

  async uploadGeneralImage(file: Express.Multer.File, folder: string = 'general'): Promise<CloudinaryUploadResult> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.cloudinaryService.uploadImage(file, folder);
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