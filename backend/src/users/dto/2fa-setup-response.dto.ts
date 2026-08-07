import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorSetupResponseDto {
  @ApiProperty({ description: 'Base32 encoded secret' })
  secret: string;

  @ApiProperty({ description: 'QR code URL for authenticator app' })
  qrCodeUrl: string;

  @ApiProperty({ description: 'Backup codes (save these securely)' })
  backupCodes: string[];
}