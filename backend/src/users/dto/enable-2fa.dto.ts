import { IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class Enable2FADto {
  @ApiProperty({ description: 'TOTP token from authenticator app' })
  @IsString()
  token: string;
}

export class Verify2FADto {
  @ApiProperty({ description: 'TOTP token from authenticator app' })
  @IsString()
  token: string;
}

export class Disable2FADto {
  @ApiProperty({ description: 'TOTP token from authenticator app' })
  @IsString()
  token: string;
}