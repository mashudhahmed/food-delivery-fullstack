// src/users/users.controller.ts
import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
  UploadedFile,
  UseInterceptors,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { NotificationPreferencesService } from './notification-preferences.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfilePictureDto } from './dto/update-profile-picture.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { VerifyEmailChangeDto } from './dto/verify-email-change.dto';
import { Enable2FADto, Verify2FADto, Disable2FADto } from './dto/enable-2fa.dto';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';
import { Throttle } from '@nestjs/throttler';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly notificationPreferencesService: NotificationPreferencesService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Returns user profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getMe(@Request() req) {
    this.logger.debug(`📖 Profile fetched for user: ${req.user.id}`);
    return this.usersService.findById(req.user.id);
  }

  @Patch('me')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateMe(@Request() req, @Body() dto: UpdateProfileDto) {
    this.logger.debug(`📝 Profile update for user: ${req.user.id}`);
    return this.usersService.updateProfile(req.user.id, dto);
  }

  @Patch('me/password')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Change current user password' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Current password is incorrect or validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async changePassword(@Request() req, @Body() dto: ChangePasswordDto) {
    this.logger.warn(`🔑 Password change requested for user: ${req.user.id}`);
    return this.usersService.changePassword(req.user.id, dto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 2, ttl: 60000 } })
  @ApiOperation({ summary: 'Soft delete current user account' })
  @ApiResponse({ status: 200, description: 'Account deleted successfully' })
  @ApiResponse({ status: 400, description: 'Account already deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Cannot delete admin account' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteMe(@Request() req) {
    this.logger.warn(`🗑️ Account deletion requested for user: ${req.user.id}`);
    return this.usersService.softDelete(
      req.user.id,
      req.user.id,
      req.user.role,
    );
  }

  // ─────────────────────────────────────────────
  // PROFILE PICTURE
  // ─────────────────────────────────────────────

  @Post('me/profile-picture')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @UseInterceptors(FileInterceptor('image'))
  @ApiOperation({ summary: 'Upload profile picture' })
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
  @ApiResponse({ status: 200, description: 'Profile picture uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.cloudinaryService.uploadProfileImage(file);
    return this.usersService.updateProfilePicture(req.user.id, {
      profilePicture: result.secureUrl,
      profilePicturePublicId: result.publicId,
    });
  }

  @Patch('me/profile-picture')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Update profile picture URL' })
  @ApiResponse({ status: 200, description: 'Profile picture updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfilePicture(
    @Body() dto: UpdateProfilePictureDto,
    @Request() req,
  ) {
    return this.usersService.updateProfilePicture(req.user.id, dto);
  }

  @Delete('me/profile-picture')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Remove profile picture' })
  @ApiResponse({ status: 200, description: 'Profile picture removed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async removeProfilePicture(@Request() req) {
    return this.usersService.removeProfilePicture(req.user.id);
  }

  // ─────────────────────────────────────────────
  // EMAIL CHANGE
  // ─────────────────────────────────────────────

  @Patch('me/email')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Request email change' })
  @ApiBody({ type: ChangeEmailDto })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 400, description: 'Invalid email or password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  async changeEmail(@Body() dto: ChangeEmailDto, @Request() req) {
    return this.usersService.changeEmail(req.user.id, dto);
  }

  @Post('me/email/verify')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify email change with token' })
  @ApiBody({ type: VerifyEmailChangeDto })
  @ApiResponse({ status: 200, description: 'Email changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid token or expired' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async verifyEmailChange(@Body() dto: VerifyEmailChangeDto, @Request() req) {
    return this.usersService.verifyEmailChange(req.user.id, dto);
  }

  @Delete('me/email/cancel')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Cancel email change request' })
  @ApiResponse({ status: 200, description: 'Email change cancelled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async cancelEmailChange(@Request() req) {
    return this.usersService.cancelEmailChange(req.user.id);
  }

  // ─────────────────────────────────────────────
  // TWO-FACTOR AUTHENTICATION
  // ─────────────────────────────────────────────

  @Post('me/2fa/setup')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Initiate 2FA setup' })
  @ApiResponse({ status: 200, description: '2FA setup initiated' })
  @ApiResponse({ status: 400, description: '2FA already enabled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async initiate2FASetup(@Request() req) {
    return this.usersService.initiate2FASetup(req.user.id);
  }

  @Post('me/2fa/enable')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Enable 2FA with verification token' })
  @ApiBody({ type: Enable2FADto })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid token or setup not initiated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async enable2FA(@Body() dto: Enable2FADto, @Request() req) {
    return this.usersService.enable2FA(req.user.id, dto);
  }

  @Post('me/2fa/verify')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify 2FA token' })
  @ApiBody({ type: Verify2FADto })
  @ApiResponse({ status: 200, description: 'Token verified' })
  @ApiResponse({ status: 400, description: 'Invalid token' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async verify2FA(@Body() dto: Verify2FADto, @Request() req) {
    const isValid = await this.usersService.verify2FA(req.user.id, dto);
    return { isValid };
  }

  @Post('me/2fa/disable')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiBody({ type: Disable2FADto })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid token or 2FA not enabled' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async disable2FA(@Body() dto: Disable2FADto, @Request() req) {
    return this.usersService.disable2FA(req.user.id, dto);
  }

  @Post('me/2fa/regenerate-backup-codes')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Regenerate backup codes' })
  @ApiBody({ type: Verify2FADto })
  @ApiResponse({ status: 200, description: 'Backup codes regenerated' })
  @ApiResponse({ status: 400, description: 'Invalid token' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async regenerateBackupCodes(@Body() dto: Verify2FADto, @Request() req) {
    return this.usersService.regenerateBackupCodes(req.user.id, dto);
  }

  @Get('me/2fa/status')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Check if 2FA is enabled' })
  @ApiResponse({ status: 200, description: '2FA status' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async get2FAStatus(@Request() req) {
    const enabled = await this.usersService.is2FAEnabled(req.user.id);
    return { enabled };
  }

  // ─────────────────────────────────────────────
  // NOTIFICATION PREFERENCES
  // ─────────────────────────────────────────────

  @Get('me/notification-preferences')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotificationPreferences(@Request() req) {
    return this.notificationPreferencesService.getPreferences(req.user.id);
  }

  @Patch('me/notification-preferences')
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiBody({ type: UpdateNotificationPreferencesDto })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateNotificationPreferences(
    @Body() dto: UpdateNotificationPreferencesDto,
    @Request() req,
  ) {
    return this.notificationPreferencesService.updatePreferences(req.user.id, dto);
  }

  @Get('me/notification-preferences/channel/:channel')
  @Throttle({ short: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Get channel-specific preferences' })
  @ApiResponse({ status: 200, description: 'Channel preferences retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getChannelPreferences(
    @Param('channel') channel: 'email' | 'push' | 'inApp',
    @Request() req,
  ) {
    return this.notificationPreferencesService.getChannelPreferences(
      req.user.id,
      channel,
    );
  }
}