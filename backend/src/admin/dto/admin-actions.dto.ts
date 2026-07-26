import { IsEnum, IsString, IsBoolean, IsOptional, IsNotEmpty, MinLength, IsIn } from 'class-validator';
import { UserRole,UserStatus } from '../../users/entities/user.entity';
import { OrderStatus } from '../../orders/entities/order.entity';

// ── Users ────────────────────────────────────────────────────────────────

export class UpdateUserStatusDto {
  @IsEnum(UserStatus, { message: `status must be one of: ${Object.values(UserStatus).join(', ')}` })
  status: UserStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateUserRoleDto {
  @IsEnum(UserRole, { message: `role must be one of: ${Object.values(UserRole).join(', ')}` })
  role: UserRole;
}

// ── Pending approvals ────────────────────────────────────────────────────

export class ApproveUserDto {
  // Only owner/agent applications go through this flow — customer/admin
  // aren't valid targets for approval, so this is intentionally narrower
  // than the full UserRole enum.
  @IsIn([UserRole.OWNER, UserRole.AGENT], { message: 'role must be either "owner" or "agent"' })
  role: UserRole;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectUserDto {
  @IsString()
  @IsNotEmpty({ message: 'reason is required when rejecting an application' })
  @MinLength(3)
  reason: string;
}

// ── Restaurants ──────────────────────────────────────────────────────────

export class UpdateRestaurantStatusDto {
  @IsIn(['active', 'inactive'], { message: 'status must be either "active" or "inactive"' })
  status: 'active' | 'inactive';
}

export class VerifyRestaurantDto {
  @IsBoolean()
  verified: boolean;
}

// ── Orders ───────────────────────────────────────────────────────────────

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, { message: `status must be one of: ${Object.values(OrderStatus).join(', ')}` })
  status: OrderStatus;
}

export class CancelOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'reason is required when cancelling an order' })
  @MinLength(3)
  reason: string;
}

// ── Delivery agents ──────────────────────────────────────────────────────

export class UpdateAgentStatusDto {
  @IsEnum(UserStatus, { message: `status must be one of: ${Object.values(UserStatus).join(', ')}` })
  status: UserStatus;
}

export class VerifyAgentDocumentDto {
  @IsIn(['drivingLicense', 'vehicleRegistration', 'nid'], {
    message: 'documentType must be one of: drivingLicense, vehicleRegistration, nid',
  })
  documentType: string;

  @IsBoolean()
  verified: boolean;
}

// ── Notifications ────────────────────────────────────────────────────────

export class SendNotificationDto {
  @IsIn(['info', 'success', 'warning', 'error'])
  type: 'info' | 'success' | 'warning' | 'error';

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsOptional()
  @IsString()
  userId?: string;
}