import { IsEmail, IsString, MinLength, IsEnum, IsOptional, IsPhoneNumber } from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsPhoneNumber()
  phone!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  // For restaurant owners
  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsString()
  businessAddress?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  // For delivery agents
  @IsOptional()
  @IsString()
  nidNumber?: string;

  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;

  @IsOptional()
  @IsString()
  drivingLicense?: string;
}