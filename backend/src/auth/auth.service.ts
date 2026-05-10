import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Determine status based on role
    let status = UserStatus.APPROVED;
    if (registerDto.role === UserRole.OWNER || registerDto.role === UserRole.AGENT) {
      status = UserStatus.PENDING;
    }

    const user = this.userRepository.create({
      ...registerDto,
      passwordHash: hashedPassword,
      role: registerDto.role || UserRole.CUSTOMER,
      status,
    });

    await this.userRepository.save(user);

    // Only generate token for auto-approved users
    const token = status === UserStatus.APPROVED ? this.generateToken(user) : null;

    return {
      message: status === UserStatus.PENDING 
        ? 'Your application has been submitted. Please wait for admin approval.'
        : 'User registered successfully',
      user: this.excludePassword(user),
      token,
      requiresApproval: status === UserStatus.PENDING,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is approved (for owners/agents)
    if (user.role !== UserRole.CUSTOMER && user.status !== UserStatus.APPROVED) {
      if (user.status === UserStatus.PENDING) {
        throw new UnauthorizedException('Your account is pending admin approval. Please wait.');
      }
      if (user.status === UserStatus.REJECTED) {
        throw new UnauthorizedException('Your application has been rejected. Contact support.');
      }
      if (user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('Your account has been suspended. Contact support.');
      }
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);

    return {
      message: 'Login successful',
      user: this.excludePassword(user),
      token,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return this.excludePassword(user);
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    
    // For security, always return success even if user not found
    if (!user) {
      return { message: 'If your email is registered, you will receive a reset link' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Token valid for 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetTokenExpiry;
    await this.userRepository.save(user);

    // Send email with reset link
    await this.mailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'Password reset link sent to your email' };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.userRepository.findOne({
      where: { resetPasswordToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await this.userRepository.save(user);

    return { message: 'Password has been reset successfully' };
  }

  private generateToken(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role, status: user.status };
    return this.jwtService.sign(payload);
  }

  private excludePassword(user: User) {
    const { passwordHash, ...result } = user;
    return result;
  }
}