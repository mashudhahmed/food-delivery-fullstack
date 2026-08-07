import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationPreferencesDto {
  // Email preferences
  @ApiPropertyOptional({ description: 'Email notifications for order status' })
  @IsOptional()
  @IsBoolean()
  emailOrderStatus?: boolean;

  @ApiPropertyOptional({ description: 'Email notifications for new orders' })
  @IsOptional()
  @IsBoolean()
  emailNewOrder?: boolean;

  @ApiPropertyOptional({ description: 'Email notifications for delivery updates' })
  @IsOptional()
  @IsBoolean()
  emailDeliveryUpdate?: boolean;

  @ApiPropertyOptional({ description: 'Email promotional notifications' })
  @IsOptional()
  @IsBoolean()
  emailPromotional?: boolean;

  @ApiPropertyOptional({ description: 'Email notifications for reviews' })
  @IsOptional()
  @IsBoolean()
  emailReview?: boolean;

  @ApiPropertyOptional({ description: 'Email system notifications' })
  @IsOptional()
  @IsBoolean()
  emailSystem?: boolean;

  @ApiPropertyOptional({ description: 'Email earnings notifications' })
  @IsOptional()
  @IsBoolean()
  emailEarnings?: boolean;

  // Push preferences
  @ApiPropertyOptional({ description: 'Push notifications for order status' })
  @IsOptional()
  @IsBoolean()
  pushOrderStatus?: boolean;

  @ApiPropertyOptional({ description: 'Push notifications for new orders' })
  @IsOptional()
  @IsBoolean()
  pushNewOrder?: boolean;

  @ApiPropertyOptional({ description: 'Push notifications for delivery updates' })
  @IsOptional()
  @IsBoolean()
  pushDeliveryUpdate?: boolean;

  @ApiPropertyOptional({ description: 'Push promotional notifications' })
  @IsOptional()
  @IsBoolean()
  pushPromotional?: boolean;

  @ApiPropertyOptional({ description: 'Push notifications for reviews' })
  @IsOptional()
  @IsBoolean()
  pushReview?: boolean;

  @ApiPropertyOptional({ description: 'Push system notifications' })
  @IsOptional()
  @IsBoolean()
  pushSystem?: boolean;

  @ApiPropertyOptional({ description: 'Push earnings notifications' })
  @IsOptional()
  @IsBoolean()
  pushEarnings?: boolean;

  // In-app preferences
  @ApiPropertyOptional({ description: 'In-app notifications for order status' })
  @IsOptional()
  @IsBoolean()
  inAppOrderStatus?: boolean;

  @ApiPropertyOptional({ description: 'In-app notifications for new orders' })
  @IsOptional()
  @IsBoolean()
  inAppNewOrder?: boolean;

  @ApiPropertyOptional({ description: 'In-app notifications for delivery updates' })
  @IsOptional()
  @IsBoolean()
  inAppDeliveryUpdate?: boolean;

  @ApiPropertyOptional({ description: 'In-app promotional notifications' })
  @IsOptional()
  @IsBoolean()
  inAppPromotional?: boolean;

  @ApiPropertyOptional({ description: 'In-app notifications for reviews' })
  @IsOptional()
  @IsBoolean()
  inAppReview?: boolean;

  @ApiPropertyOptional({ description: 'In-app system notifications' })
  @IsOptional()
  @IsBoolean()
  inAppSystem?: boolean;

  @ApiPropertyOptional({ description: 'In-app earnings notifications' })
  @IsOptional()
  @IsBoolean()
  inAppEarnings?: boolean;
}