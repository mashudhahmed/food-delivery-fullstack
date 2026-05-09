import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private mailService: MailService,
  ) {}

  async getPendingApprovals() {
    return await this.userRepository.find({
      where: [{ role: UserRole.OWNER, status: UserStatus.PENDING }, { role: UserRole.AGENT, status: UserStatus.PENDING }],
      select: ['id', 'fullName', 'email', 'phone', 'role', 'businessName', 'businessAddress', 'taxId', 'nidNumber', 'vehicleType', 'vehicleNumber', 'drivingLicense', 'createdAt'],
      order: { createdAt: 'ASC' },
    });
  }

  async getAllApplications(role?: string) {
    const whereCondition: any = [{ role: UserRole.OWNER }, { role: UserRole.AGENT }];
    if (role) {
      whereCondition.filter(r => r.role === role);
    }
    
    return await this.userRepository.find({
      where: whereCondition,
      select: ['id', 'fullName', 'email', 'phone', 'role', 'status', 'businessName', 'createdAt', 'approvedAt', 'rejectionReason'],
      order: { createdAt: 'DESC' },
    });
  }

  async getApplicationStats() {
    const pendingOwners = await this.userRepository.count({ where: { role: UserRole.OWNER, status: UserStatus.PENDING } });
    const pendingAgents = await this.userRepository.count({ where: { role: UserRole.AGENT, status: UserStatus.PENDING } });
    const approvedOwners = await this.userRepository.count({ where: { role: UserRole.OWNER, status: UserStatus.APPROVED } });
    const approvedAgents = await this.userRepository.count({ where: { role: UserRole.AGENT, status: UserStatus.APPROVED } });
    const rejected = await this.userRepository.count({ where: { status: UserStatus.REJECTED } });

    return {
      pending: { owners: pendingOwners, agents: pendingAgents, total: pendingOwners + pendingAgents },
      approved: { owners: approvedOwners, agents: approvedAgents, total: approvedOwners + approvedAgents },
      rejected,
    };
  }

  async approveUser(userId: string, role?: string, notes?: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = UserStatus.APPROVED;
    user.approvedAt = new Date();
    if (role) user.role = role as UserRole;

    await this.userRepository.save(user);

    // Send approval email
    await this.mailService.sendApprovalEmail(user.email, user.fullName, user.role, notes);

    return { message: `${user.fullName} has been approved as ${user.role}`, user };
  }

  async rejectUser(userId: string, reason: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = UserStatus.REJECTED;
    user.rejectionReason = reason;
    await this.userRepository.save(user);

    // Send rejection email
    await this.mailService.sendRejectionEmail(user.email, user.fullName, reason);

    return { message: `${user.fullName}'s application has been rejected`, user };
  }

  async getUserStats() {
    const totalUsers = await this.userRepository.count();
    const customers = await this.userRepository.count({ where: { role: UserRole.CUSTOMER } });
    const owners = await this.userRepository.count({ where: { role: UserRole.OWNER } });
    const agents = await this.userRepository.count({ where: { role: UserRole.AGENT } });
    const admins = await this.userRepository.count({ where: { role: UserRole.ADMIN } });

    return { totalUsers, customers, owners, agents, admins };
  }
}