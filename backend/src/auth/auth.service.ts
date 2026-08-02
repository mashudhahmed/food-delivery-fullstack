import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly ACCESS_TOKEN_TTL = '15m';
  private readonly REFRESH_TOKEN_TTL_DAYS = 7;
  private readonly BCRYPT_ROUNDS = 12;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
  ) {}

  // ─────────────────────────────────────────────
  // REGISTER
  // ─────────────────────────────────────────────
  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      this.BCRYPT_ROUNDS,
    );

    let status = UserStatus.APPROVED;
    if (
      registerDto.role === UserRole.OWNER ||
      registerDto.role === UserRole.AGENT
    ) {
      status = UserStatus.PENDING;
    }

    const user = this.userRepository.create({
      ...registerDto,
      email: registerDto.email.toLowerCase(),
      passwordHash: hashedPassword,
      role: registerDto.role || UserRole.CUSTOMER,
      status,
    });

    await this.userRepository.save(user);

    if (status === UserStatus.PENDING) {
      return {
        message:
          'Your application has been submitted. Please wait for admin approval.',
        user: this.sanitizeUser(user),
        requiresApproval: true,
      };
    }

    const tokens = await this.issueTokens(user);
    return {
      message: 'User registered successfully',
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  // ─────────────────────────────────────────────
  // LOGIN
  // ─────────────────────────────────────────────
  async login(
    loginDto: LoginDto,
    meta?: { ip?: string; userAgent?: string },
  ) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Block non-approved owners / agents
    if (
      user.role !== UserRole.CUSTOMER &&
      user.status !== UserStatus.APPROVED
    ) {
      if (user.status === UserStatus.PENDING) {
        throw new UnauthorizedException(
          'Your account is pending admin approval. Please wait.',
        );
      }
      if (user.status === UserStatus.REJECTED) {
        throw new UnauthorizedException(
          'Your application has been rejected. Contact support.',
        );
      }
      if (user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException(
          'Your account has been suspended. Contact support.',
        );
      }
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    user.lastLogin = new Date();
    await this.userRepository.save(user);

    const tokens = await this.issueTokens(user, meta);

    return {
      message: 'Login successful',
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    };
  }

  // ─────────────────────────────────────────────
  // REFRESH (selector + verifier, rotation + reuse detection)
  // ─────────────────────────────────────────────
  async refresh(
    refreshToken: string,
    meta?: { ip?: string; userAgent?: string },
  ) {
    if (!refreshToken || !refreshToken.includes('.')) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const [selector, verifier] = refreshToken.split('.');
    if (!selector || !verifier) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const matched = await this.refreshTokenRepository.findOne({
      where: { selector, revoked: false },
      relations: ['user'],
    });

    if (!matched) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (matched.expiresAt < new Date()) {
      matched.revoked = true;
      matched.revokedAt = new Date();
      await this.refreshTokenRepository.save(matched);
      throw new UnauthorizedException('Refresh token expired');
    }

    const isMatch = await bcrypt.compare(verifier, matched.tokenHash);
    if (!isMatch) {
      // Possible reuse → revoke whole family
      await this.refreshTokenRepository.update(
        { family: matched.family },
        { revoked: true, revokedAt: new Date() },
      );
      throw new UnauthorizedException(
        'Refresh token reuse detected. All sessions revoked for security.',
      );
    }

    if (matched.replacedByTokenId) {
      await this.refreshTokenRepository.update(
        { family: matched.family },
        { revoked: true, revokedAt: new Date() },
      );
      throw new UnauthorizedException(
        'Refresh token reuse detected. All sessions revoked for security.',
      );
    }

    const user = matched.user;
    if (
      !user ||
      (user.role !== UserRole.CUSTOMER && user.status !== UserStatus.APPROVED)
    ) {
      throw new UnauthorizedException(
        'User is no longer allowed to authenticate',
      );
    }

    const newTokens = await this.issueTokens(user, meta, matched.family);

    matched.revoked = true;
    matched.revokedAt = new Date();
    matched.replacedByTokenId = newTokens.refreshTokenId;
    await this.refreshTokenRepository.save(matched);

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newTokens.refreshToken,
      expiresIn: newTokens.expiresIn,
    };
  }

  // ─────────────────────────────────────────────
  // LOGOUT (single device)
  // ─────────────────────────────────────────────
  async logout(refreshToken: string) {
    if (!refreshToken?.includes('.')) {
      return { message: 'Logged out' };
    }

    const [selector] = refreshToken.split('.');
    await this.refreshTokenRepository.update(
      { selector },
      { revoked: true, revokedAt: new Date() },
    );

    return { message: 'Logged out successfully' };
  }

  // ─────────────────────────────────────────────
  // LOGOUT ALL DEVICES
  // ─────────────────────────────────────────────
  async logoutAll(userId: string) {
    await this.refreshTokenRepository.update(
      { userId, revoked: false },
      { revoked: true, revokedAt: new Date() },
    );
    return { message: 'Logged out from all devices' };
  }

  // ─────────────────────────────────────────────
  // GET CURRENT USER
  // ─────────────────────────────────────────────
  async getCurrentUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.sanitizeUser(user);
  }

  // ─────────────────────────────────────────────
  // FORGOT PASSWORD
  // ─────────────────────────────────────────────
  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    // Always return success (security)
    if (!user) {
      return {
        message: 'If your email is registered, you will receive a reset link',
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await this.userRepository.save(user);

    await this.mailService.sendPasswordResetEmail(
      user.email,
      resetToken,
      user.fullName,
    );

    return { message: 'Password reset link sent to your email' };
  }

  // ─────────────────────────────────────────────
  // RESET PASSWORD
  // ─────────────────────────────────────────────
  async resetPassword(token: string, newPassword: string) {
    const user = await this.userRepository.findOne({
      where: { resetPasswordToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);
    user.passwordHash = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepository.save(user);

    // Revoke all refresh tokens after password change
    await this.refreshTokenRepository.update(
      { userId: user.id, revoked: false },
      { revoked: true, revokedAt: new Date() },
    );

    return { message: 'Password has been reset successfully' };
  }

  // ─────────────────────────────────────────────
  // CLEANUP (call periodically via cron)
  // ─────────────────────────────────────────────
  async cleanupExpiredTokens() {
    const result = await this.refreshTokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
    return { deleted: result.affected || 0 };
  }

  // ─────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────
  private async issueTokens(
    user: User,
    meta?: { ip?: string; userAgent?: string },
    existingFamily?: string,
  ) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.ACCESS_TOKEN_TTL,
    });

    // selector = public part (indexed), verifier = secret part (hashed)
    const selector = crypto.randomBytes(16).toString('hex');
    const verifier = crypto.randomBytes(32).toString('hex');
    const tokenHash = await bcrypt.hash(verifier, 10);

    const family = existingFamily || crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.REFRESH_TOKEN_TTL_DAYS);

    const refreshTokenEntity = this.refreshTokenRepository.create({
      userId: user.id,
      selector, // REQUIRED – was missing and caused 500 on login
      tokenHash,
      family,
      expiresAt,
      userAgent: meta?.userAgent ?? null,
      ipAddress: meta?.ip ?? null,
      revoked: false,
      revokedAt: null,
      replacedByTokenId: null,
    });

    const saved = await this.refreshTokenRepository.save(refreshTokenEntity);

    // Client stores: selector.verifier
    const refreshToken = `${selector}.${verifier}`;

    return {
      accessToken,
      refreshToken,
      expiresIn: 15 * 60, // 15 minutes in seconds
      refreshTokenId: saved.id,
    };
  }

  private sanitizeUser(user: User) {
    const {
      passwordHash,
      resetPasswordToken,
      resetPasswordExpires,
      ...safe
    } = user as any;
    return safe;
  }
}