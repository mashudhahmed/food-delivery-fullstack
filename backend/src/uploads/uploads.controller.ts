import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Delete,
  Param,
  Query,
  Body,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { ApiTags, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CloudinaryUploadResult } from '../cloudinary/cloudinary.service';

@ApiTags('uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('restaurant')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadRestaurantImage(@UploadedFile() file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    return this.uploadsService.uploadRestaurantImage(file);
  }

  @Post('menu-item')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadMenuItemImage(@UploadedFile() file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    return this.uploadsService.uploadMenuItemImage(file);
  }

  @Post('profile')
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  async uploadProfileImage(@UploadedFile() file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    return this.uploadsService.uploadProfileImage(file);
  }

  @Post('general')
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.AGENT)
  @UseInterceptors(FileInterceptor('image'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
        },
      },
    },
  })
  async uploadGeneralImage(
    @UploadedFile() file: Express.Multer.File,
    @Body('folder') folder?: string
  ): Promise<CloudinaryUploadResult> {
    return this.uploadsService.uploadGeneralImage(file, folder);
  }

  @Delete(':publicId')
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  async deleteFile(@Param('publicId') publicId: string): Promise<{ success: boolean }> {
    return this.uploadsService.deleteFile(publicId);
  }

  @Get('optimize/:publicId')
  getOptimizedImageUrl(
    @Param('publicId') publicId: string,
    @Query('width') width?: string,
    @Query('height') height?: string,
    @Query('quality') quality?: string
  ): { url: string } {
    const url = this.uploadsService.getOptimizedImageUrl(publicId, {
      width: width ? parseInt(width) : undefined,
      height: height ? parseInt(height) : undefined,
      quality: quality || 'auto',
    });
    return { url };
  }

  @Get('responsive/:publicId')
  getResponsiveImages(@Param('publicId') publicId: string): { srcSet: string; sizes: string } {
    return this.uploadsService.getResponsiveImages(publicId);
  }
}