import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfilePictureDto {
  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/.../profile.jpg' })
  @IsString()
  profilePicture?: string;

  @ApiPropertyOptional({ example: 'cloudinary_public_id' })
  @IsString()
  @IsOptional()
  profilePicturePublicId?: string;
}