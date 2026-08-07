import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangeEmailDto {
  @ApiProperty({ 
    example: 'newemail@example.com', 
    description: 'New email address' 
  })
  @IsEmail()
  newEmail: string;

  @ApiProperty({ 
    example: 'CurrentPassword123!', 
    description: 'Current password for verification' 
  })
  @IsString()
  @MinLength(1)
  currentPassword: string;
}