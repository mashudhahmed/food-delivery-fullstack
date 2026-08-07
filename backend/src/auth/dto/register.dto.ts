// src/auth/dto/register.dto.ts
import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(64)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'Password must contain at least 1 uppercase, 1 lowercase, 1 number and 1 special character (@$!%*?&)',
    },
  )
  password!: string;

  @Matches(/^(\+8801|01)[3-9]\d{8}$/, {
    message:
      'Please enter a valid Bangladeshi phone number (e.g., 01XXXXXXXXX or +8801XXXXXXXXX)',
  })
  phone!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  // ── Restaurant Owner Fields ──
  @ValidateIf(o => o.role === UserRole.OWNER)
  @IsString()
  @MinLength(2)
  businessName!: string;

  @ValidateIf(o => o.role === UserRole.OWNER)
  @IsString()
  businessAddress!: string;

  @ValidateIf(o => o.role === UserRole.OWNER)
  @IsString()
  taxId!: string;

  // ── Delivery Agent Fields ──
  @ValidateIf(o => o.role === UserRole.AGENT)
  @IsString()
  nidNumber!: string;

  @ValidateIf(o => o.role === UserRole.AGENT)
  @IsString()
  vehicleType!: string;

  @ValidateIf(o => o.role === UserRole.AGENT)
  @IsString()
  vehicleNumber!: string;

  @ValidateIf(o => o.role === UserRole.AGENT)
  @IsString()
  drivingLicense!: string;
}