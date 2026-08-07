import { Injectable } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';

@Injectable()
export class TwoFactorService {
  
  /**
   * Generate a TOTP secret for a user
   */
  generateSecret(email: string) {
    const secret = speakeasy.generateSecret({
      name: `FoodDeliveryApp:${email}`,
    });
    return {
      secret: secret.base32,
      otpAuthUrl: secret.otpauth_url,
    };
  }

  /**
   * Generate a QR code image URL from the OTP auth URL
   */
  async generateQRCode(otpAuthUrl: string): Promise<string> {
    try {
      return await qrcode.toDataURL(otpAuthUrl);
    } catch (error) {
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Verify a TOTP token against a secret
   */
  verifyToken(secret: string, token: string): boolean {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1, // Allow 1 step drift (30 seconds)
    });
  }

  /**
   * Generate backup codes (10 codes, 8 characters each)
   */
  generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate a random 8-character alphanumeric code
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Verify a backup code against stored backup codes
   */
  verifyBackupCode(token: string, backupCodes: string[]): boolean {
    const index = backupCodes.indexOf(token);
    if (index !== -1) {
      // Remove the used code
      backupCodes.splice(index, 1);
      return true;
    }
    return false;
  }
}