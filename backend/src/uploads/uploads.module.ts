import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    CloudinaryModule,
    MulterModule.register({
      storage: memoryStorage(),
      fileFilter: (req, file, callback) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const isValidExt = allowedTypes.test(
          file.originalname.split('.').pop().toLowerCase()
        );
        const isValidMime = allowedTypes.test(file.mimetype);

        if (isValidMime && isValidExt) {
          callback(null, true);
        } else {
          callback(new Error('Only image files are allowed'), false);
        }
      },
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}