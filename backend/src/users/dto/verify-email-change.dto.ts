import { IsString, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailChangeDto {
  @ApiProperty({ description: 'Verification token sent to new email' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'New email address' })
  @IsEmail()
  newEmail: string;
}