// src/users/users.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfilePictureDto } from './dto/update-profile-picture.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { VerifyEmailChangeDto } from './dto/verify-email-change.dto';
import { Enable2FADto, Verify2FADto, Disable2FADto } from './dto/enable-2fa.dto';
import { TwoFactorSetupResponseDto } from './dto/2fa-setup-response.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { TwoFactorService } from '../common/services/two-factor.service';
// import { EmailQueueService } from '../common/queue/email-queue.service'; // <-- Commented out

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly cloudinaryService: CloudinaryService,
    private readonly twoFactorService: TwoFactorService,
    // private readonly emailQueue: EmailQueueService, // <-- Commented out
  ) {}

  async findById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitize(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId, isDeleted: false },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const updates: Partial<User> = {};

      if (dto.fullName !== undefined) {
        if (dto.fullName.length < 2) {
          throw new BadRequestException('Full name must be at least 2 characters');
        }
        updates.fullName = dto.fullName.trim();
      }

      if (dto.phone !== undefined) {
        const normalizedPhone = this.normalizePhone(dto.phone);
        if (dto.phone) {
          const existingPhone = await queryRunner.manager.findOne(User, {
            where: { phone: normalizedPhone, isDeleted: false },
          });
          if (existingPhone && existingPhone.id !== userId) {
            throw new BadRequestException('Phone number already in use');
          }
        }
        updates.phone = normalizedPhone;
      }

      if (dto.address !== undefined) {
        updates.address = dto.address.trim();
      }

      if (user.role === UserRole.OWNER) {
        if (dto.businessName !== undefined) {
          if (dto.businessName.length < 2) {
            throw new BadRequestException('Business name must be at least 2 characters');
          }
          updates.businessName = dto.businessName.trim();
        }

        if (dto.businessAddress !== undefined) {
          updates.businessAddress = dto.businessAddress.trim();
        }

        if (dto.taxId !== undefined) {
          updates.taxId = dto.taxId.trim().toUpperCase();
        }
      } else {
        if (dto.businessName !== undefined || 
            dto.businessAddress !== undefined || 
            dto.taxId !== undefined) {
          throw new ForbiddenException('These fields are only for restaurant owners');
        }
      }

      if (user.role === UserRole.AGENT) {
        if (dto.nidNumber !== undefined) {
          if (dto.nidNumber.length < 10) {
            throw new BadRequestException('NID must be at least 10 characters');
          }
          if (!/^\d+$/.test(dto.nidNumber)) {
            throw new BadRequestException('NID must contain only numbers');
          }
          const existingNid = await queryRunner.manager.findOne(User, {
            where: { nidNumber: dto.nidNumber, isDeleted: false },
          });
          if (existingNid && existingNid.id !== userId) {
            throw new BadRequestException('NID already registered');
          }
          updates.nidNumber = dto.nidNumber;
        }

        if (dto.vehicleType !== undefined) {
          if (dto.vehicleType.length < 2) {
            throw new BadRequestException('Vehicle type must be at least 2 characters');
          }
          updates.vehicleType = dto.vehicleType.trim();
        }

        if (dto.vehicleNumber !== undefined) {
          updates.vehicleNumber = dto.vehicleNumber.trim().toUpperCase();
        }

        if (dto.drivingLicense !== undefined) {
          updates.drivingLicense = dto.drivingLicense.trim().toUpperCase();
        }
      } else {
        if (dto.nidNumber !== undefined ||
            dto.vehicleType !== undefined ||
            dto.vehicleNumber !== undefined ||
            dto.drivingLicense !== undefined) {
          throw new ForbiddenException('These fields are only for delivery agents');
        }
      }

      Object.assign(user, updates);
      const savedUser = await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();

      this.logger.log(`✅ Profile updated for user: ${user.email} (${user.role})`);

      return this.sanitize(savedUser);

    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Failed to update profile: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });
    if (!user) throw new NotFoundException('User not found');

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const isSame = await bcrypt.compare(dto.newPassword, user.passwordHash);
    if (isSame) {
      throw new BadRequestException('New password must be different from current password');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepository.save(user);

    this.logger.warn(`🔑 Password changed for user: ${user.email}`);

    return { message: 'Password changed successfully' };
  }

  async softDelete(userId: string, requestingUserId: string, role: UserRole) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (userId !== requestingUserId && role !== UserRole.ADMIN) {
        throw new ForbiddenException('You can only delete your own account');
      }

      const user = await queryRunner.manager.findOne(User, {
        where: { id: userId },
      });

      if (!user) throw new NotFoundException('User not found');

      if (user.role === UserRole.ADMIN) {
        throw new ForbiddenException('Cannot delete admin account');
      }

      if (user.isDeleted) {
        throw new BadRequestException('Account is already deleted');
      }

      user.isDeleted = true;
      user.status = 'suspended' as any;
      user.email = `deleted_${user.id}_${user.email}`;
      await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();

      this.logger.warn(`🗑️ Account soft-deleted: ${user.email} (${user.role})`);

      return { message: 'Account deleted successfully' };

    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─────────────────────────────────────────────
  // PROFILE PICTURE
  // ─────────────────────────────────────────────

  async updateProfilePicture(
    userId: string,
    dto: UpdateProfilePictureDto,
  ): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.profilePicturePublicId) {
      try {
        await this.cloudinaryService.deleteFile(user.profilePicturePublicId);
      } catch (error) {
        console.warn('Failed to delete old profile picture:', error.message);
      }
    }

    if (dto.profilePicture) {
      user.profilePicture = dto.profilePicture;
      user.profilePicturePublicId = dto.profilePicturePublicId || null;
    } else {
      user.profilePicture = null;
      user.profilePicturePublicId = null;
    }

    await this.userRepository.save(user);

    return {
      message: 'Profile picture updated successfully',
      profilePicture: user.profilePicture,
    };
  }

  async removeProfilePicture(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.profilePicturePublicId) {
      try {
        await this.cloudinaryService.deleteFile(user.profilePicturePublicId);
      } catch (error) {
        console.warn('Failed to delete profile picture:', error.message);
      }
    }

    user.profilePicture = null;
    user.profilePicturePublicId = null;
    await this.userRepository.save(user);

    return {
      message: 'Profile picture removed successfully',
    };
  }

  // ─────────────────────────────────────────────
  // EMAIL CHANGE
  // ─────────────────────────────────────────────

  async changeEmail(userId: string, dto: ChangeEmailDto): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValidPassword = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValidPassword) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (user.email === dto.newEmail) {
      throw new BadRequestException('New email must be different from current email');
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: dto.newEmail, isDeleted: false },
    });
    if (existingUser) {
      throw new ConflictException('Email already in use by another account');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24);

    user.pendingEmail = dto.newEmail;
    user.emailChangeToken = token;
    user.emailChangeTokenExpires = tokenExpiry;

    await this.userRepository.save(user);

    // Email sending logic is temporarily commented out to avoid seeding errors
    // try {
    //   await this.emailQueue.sendEmailChangeVerification(
    //     dto.newEmail,
    //     token,
    //     user.fullName,
    //   );
    // } catch (error) {
    //   console.error('Failed to send email change verification:', error.message);
    // }

    return {
      message: 'Verification email sent to new address. Please check your inbox.',
      pendingEmail: dto.newEmail,
      expiresIn: '24 hours',
    };
  }

  async verifyEmailChange(userId: string, dto: VerifyEmailChangeDto): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.pendingEmail !== dto.newEmail) {
      throw new BadRequestException('Email mismatch. Please request a new change.');
    }

    if (!user.emailChangeToken || user.emailChangeToken !== dto.token) {
      throw new BadRequestException('Invalid verification token');
    }

    if (!user.emailChangeTokenExpires || user.emailChangeTokenExpires < new Date()) {
      throw new BadRequestException('Verification token has expired. Please request a new change.');
    }

    user.email = dto.newEmail;
    user.pendingEmail = null;
    user.emailChangeToken = null;
    user.emailChangeTokenExpires = null;

    await this.userRepository.save(user);

    // Email sending logic is temporarily commented out to avoid seeding errors
    // try {
    //   await this.emailQueue.sendEmailChangeConfirmation(
    //     user.email,
    //     user.fullName,
    //   );
    // } catch (error) {
    //   console.error('Failed to send email change confirmation:', error.message);
    // }

    return {
      message: 'Email changed successfully',
      newEmail: user.email,
    };
  }

  async cancelEmailChange(userId: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.pendingEmail = null;
    user.emailChangeToken = null;
    user.emailChangeTokenExpires = null;

    await this.userRepository.save(user);

    return {
      message: 'Email change request cancelled',
    };
  }

  // ─────────────────────────────────────────────
  // TWO-FACTOR AUTHENTICATION
  // ─────────────────────────────────────────────

  async initiate2FASetup(userId: string): Promise<TwoFactorSetupResponseDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const { secret, otpAuthUrl } = this.twoFactorService.generateSecret(user.email);
    const qrCodeUrl = await this.twoFactorService.generateQRCode(otpAuthUrl);
    const backupCodes = this.twoFactorService.generateBackupCodes(10);

    user.twoFactorSecret = secret;
    user.twoFactorBackupCodes = JSON.stringify(backupCodes);
    await this.userRepository.save(user);

    return {
      secret,
      qrCodeUrl,
      backupCodes,
    };
  }

  async enable2FA(userId: string, dto: Enable2FADto): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('Please initiate 2FA setup first');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }

    const isValid = this.twoFactorService.verifyToken(user.twoFactorSecret, dto.token);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    user.twoFactorEnabled = true;
    await this.userRepository.save(user);

    return {
      message: 'Two-factor authentication enabled successfully',
      backupCodes: JSON.parse(user.twoFactorBackupCodes || '[]'),
    };
  }

  async verify2FA(userId: string, dto: Verify2FADto): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('2FA secret not configured');
    }

    let isValid = this.twoFactorService.verifyToken(user.twoFactorSecret, dto.token);
    
    if (!isValid) {
      const backupCodes = JSON.parse(user.twoFactorBackupCodes || '[]');
      isValid = this.twoFactorService.verifyBackupCode(dto.token, backupCodes);
      
      if (isValid) {
        user.twoFactorBackupCodes = JSON.stringify(backupCodes);
        await this.userRepository.save(user);
      }
    }

    return isValid;
  }

  async disable2FA(userId: string, dto: Disable2FADto): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const isValid = this.twoFactorService.verifyToken(user.twoFactorSecret!, dto.token);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorBackupCodes = null;
    await this.userRepository.save(user);

    return {
      message: 'Two-factor authentication disabled successfully',
    };
  }

  async regenerateBackupCodes(userId: string, dto: Verify2FADto): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorEnabled) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }

    const isValid = this.twoFactorService.verifyToken(user.twoFactorSecret!, dto.token);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    const backupCodes = this.twoFactorService.generateBackupCodes(10);
    user.twoFactorBackupCodes = JSON.stringify(backupCodes);
    await this.userRepository.save(user);

    return {
      message: 'Backup codes regenerated successfully',
      backupCodes,
    };
  }

  async is2FAEnabled(userId: string): Promise<boolean> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
      select: ['twoFactorEnabled'],
    });

    return user?.twoFactorEnabled || false;
  }

  // ─────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────

  private normalizePhone(phone: string): string {
    let normalized = phone.replace(/[\s\-()]/g, '');
    if (normalized.startsWith('01')) {
      normalized = '+880' + normalized.slice(1);
    }
    return normalized;
  }

  private sanitize(user: User) {
    const {
      passwordHash,
      resetPasswordToken,
      resetPasswordExpires,
      emailChangeToken,
      emailChangeTokenExpires,
      twoFactorSecret,
      twoFactorBackupCodes,
      ...safe
    } = user as any;
    return safe;
  }
}