import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from './entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id, isDeleted: false },
    });
    if (!user) throw new NotFoundException('User not found');
    return this.sanitize(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });
    if (!user) throw new NotFoundException('User not found');

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.address !== undefined) user.address = dto.address;

    if (user.role === UserRole.OWNER) {
      if (dto.businessName !== undefined) user.businessName = dto.businessName;
      if (dto.businessAddress !== undefined)
        user.businessAddress = dto.businessAddress;
      if (dto.taxId !== undefined) user.taxId = dto.taxId;
    }
    if (user.role === UserRole.AGENT) {
      if (dto.vehicleType !== undefined) user.vehicleType = dto.vehicleType;
      if (dto.vehicleNumber !== undefined)
        user.vehicleNumber = dto.vehicleNumber;
      if (dto.drivingLicense !== undefined)
        user.drivingLicense = dto.drivingLicense;
      if (dto.nidNumber !== undefined) user.nidNumber = dto.nidNumber;
    }

    await this.userRepository.save(user);
    return this.sanitize(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
    });
    if (!user) throw new NotFoundException('User not found');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 12);
    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }

  async softDelete(userId: string, requestingUserId: string, role: UserRole) {
    if (userId !== requestingUserId && role !== UserRole.ADMIN) {
      throw new ForbiddenException('You can only delete your own account');
    }

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot delete admin account');
    }

    user.isDeleted = true;
    await this.userRepository.save(user);
    return { message: 'Account deleted successfully' };
  }

  private sanitize(user: User) {
    const { passwordHash, resetPasswordToken, resetPasswordExpires, ...safe } =
      user as any;
    return safe;
  }
}