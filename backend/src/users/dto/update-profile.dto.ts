import {
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
  Matches,
  IsEnum,
  ValidateIf,
  IsPhoneNumber,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValidateStringLength } from '../../common/decorators/validate-string-length.decorator';

export class UpdateProfileDto {
  // ── COMMON FIELDS (All Roles) ──

  @ApiPropertyOptional({ example: 'John Doe', description: 'Full name of the user' })
  @IsOptional()
  @IsString()
  @ValidateStringLength(2, 100)
  fullName?: string;

  @ApiPropertyOptional({ 
    example: '+8801712345678', 
    description: 'Bangladeshi phone number' 
  })
  @IsOptional()
  @Matches(/^(\+8801|01)[3-9]\d{8}$/, {
    message: 'Valid Bangladeshi phone required (e.g., 01XXXXXXXXX or +8801XXXXXXXXX)',
  })
  phone?: string;

  @ApiPropertyOptional({ example: '123 Main Street, Dhaka', description: 'User address' })
  @IsOptional()
  @IsString()
  @ValidateStringLength(0, 500)
  address?: string;

  // ── OWNER FIELDS (Only for Restaurant Owners) ──

  @ApiPropertyOptional({ example: 'My Restaurant', description: 'Business name (Owner only)' })
  @IsOptional()
  @ValidateIf((o) => o.role === UserRole.OWNER || o.businessName !== undefined)
  @IsString()
  @ValidateStringLength(2, 200)
  businessName?: string;

  @ApiPropertyOptional({ example: '123 Business Street', description: 'Business address (Owner only)' })
  @IsOptional()
  @ValidateIf((o) => o.role === UserRole.OWNER || o.businessAddress !== undefined)
  @IsString()
  @ValidateStringLength(0, 500)
  businessAddress?: string;

  @ApiPropertyOptional({ example: 'TAX-123456', description: 'Tax ID (Owner only)' })
  @IsOptional()
  @ValidateIf((o) => o.role === UserRole.OWNER || o.taxId !== undefined)
  @IsString()
  @MaxLength(50, { message: 'Tax ID must not exceed 50 characters' })
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'Tax ID can only contain uppercase letters, numbers, and hyphens',
  })
  taxId?: string;

  // ── AGENT FIELDS (Only for Delivery Agents) ──

  @ApiPropertyOptional({ example: '1234567890', description: 'NID number (Agent only)' })
  @IsOptional()
  @ValidateIf((o) => o.role === UserRole.AGENT || o.nidNumber !== undefined)
  @IsString()
  @ValidateStringLength(10, 20)
  @Matches(/^[0-9]+$/, { message: 'NID must contain only numbers' })
  nidNumber?: string;

  @ApiPropertyOptional({ example: 'Motorcycle', description: 'Vehicle type (Agent only)' })
  @IsOptional()
  @ValidateIf((o) => o.role === UserRole.AGENT || o.vehicleType !== undefined)
  @IsString()
  @ValidateStringLength(2, 50)
  vehicleType?: string;

  @ApiPropertyOptional({ example: 'DHAKA-1234', description: 'Vehicle number (Agent only)' })
  @IsOptional()
  @ValidateIf((o) => o.role === UserRole.AGENT || o.vehicleNumber !== undefined)
  @IsString()
  @ValidateStringLength(3, 20)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'Vehicle number can only contain uppercase letters, numbers, and hyphens',
  })
  vehicleNumber?: string;

  @ApiPropertyOptional({ example: 'DL-12345', description: 'Driving license (Agent only)' })
  @IsOptional()
  @ValidateIf((o) => o.role === UserRole.AGENT || o.drivingLicense !== undefined)
  @IsString()
  @ValidateStringLength(3, 50)
  @Matches(/^[A-Z0-9-]+$/, {
    message: 'Driving license can only contain uppercase letters, numbers, and hyphens',
  })
  drivingLicense?: string;
}