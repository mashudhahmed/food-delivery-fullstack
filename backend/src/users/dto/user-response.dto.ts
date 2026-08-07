import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../entities/user.entity';

export class UserResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  fullName: string;

  @ApiProperty({ example: 'john@example.com' })
  email: string;

  @ApiProperty({ example: '+8801712345678' })
  phone: string;

  @ApiProperty({ example: '123 Main St', required: false })
  address?: string;

  @ApiProperty({ 
    example: 'https://res.cloudinary.com/.../profile.jpg',
    required: false,
    description: 'Profile picture URL'
  })
  profilePicture?: string;

  @ApiProperty({ enum: UserRole, example: 'customer' })
  role: UserRole;

  @ApiProperty({ enum: UserStatus, example: 'approved' })
  status: UserStatus;

  @ApiProperty({ example: false })
  isDeleted: boolean;

  // Owner fields
  @ApiProperty({ required: false })
  businessName?: string;

  @ApiProperty({ required: false })
  businessAddress?: string;

  @ApiProperty({ required: false })
  taxId?: string;

  // Agent fields
  @ApiProperty({ required: false })
  nidNumber?: string;

  @ApiProperty({ required: false })
  vehicleType?: string;

  @ApiProperty({ required: false })
  vehicleNumber?: string;

  @ApiProperty({ required: false })
  drivingLicense?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ required: false })
  lastLogin?: Date;
}