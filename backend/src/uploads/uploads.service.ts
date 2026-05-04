import { Injectable, BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';

@Injectable()
export class UploadsService {
  constructor() {
    // Ensure upload directory exists
    if (!existsSync('./uploads')) {
      mkdirSync('./uploads', { recursive: true });
    }
  }

  async uploadFile(file: Express.Multer.File, folder: string = 'general') {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const fileUrl = `${process.env.API_URL || 'http://localhost:3000'}/uploads/${file.filename}`;
    
    return {
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimeType: file.mimetype,
      url: fileUrl,
    };
  }

  async deleteFile(filename: string): Promise<void> {
    const filePath = join('./uploads', filename);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }

  async uploadRestaurantImage(file: Express.Multer.File) {
    return this.uploadFile(file, 'restaurants');
  }

  async uploadMenuItemImage(file: Express.Multer.File) {
    return this.uploadFile(file, 'menu-items');
  }
}