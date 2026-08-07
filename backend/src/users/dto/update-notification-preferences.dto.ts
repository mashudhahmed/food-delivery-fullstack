import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationPreferencesDto {
  // ── EMAIL PREFERENCES ──

  @ApiPropertyOptional({ description: 'Receive order status updates via email' })
  @IsBoolean()
  @IsOptional()
  emailOrderStatus?: boolean;

  @ApiPropertyOptional({ description: 'Receive notifications for new orders via email' })
  @IsBoolean()
  @IsOptional()
  emailNewOrder?: boolean;

  @ApiPropertyOptional({ description: 'Receive delivery status updates via email' })
  @IsBoolean()
  @IsOptional()
  emailDeliveryUpdate?: boolean;

  @ApiPropertyOptional({ description: 'Receive promotional emails' })
  @IsBoolean()
  @IsOptional()
  emailPromotional?: boolean;

  @ApiPropertyOptional({ description: 'Receive review request emails' })
  @IsBoolean()
  @IsOptional()
  emailReview?: boolean;

  @ApiPropertyOptional({ description: 'Receive system notification emails' })
  @IsBoolean()
  @IsOptional()
  emailSystem?: boolean;

  @ApiPropertyOptional({ description: 'Receive earnings report emails (for owners/agents)' })
  @IsBoolean()
  @IsOptional()
  emailEarnings?: boolean;


  // ── PUSH NOTIFICATION PREFERENCES ──

  @ApiPropertyOptional({ description: 'Receive order status updates via push notification' })
  @IsBoolean()
  @IsOptional()
  pushOrderStatus?: boolean;

  @ApiPropertyOptional({ description: 'Receive notifications for new orders via push' })
  @IsBoolean()
  @IsOptional()
  pushNewOrder?: boolean;

  @ApiPropertyOptional({ description: 'Receive delivery status updates via push' })
  @IsBoolean()
  @IsOptional()
  pushDeliveryUpdate?: boolean;

  @ApiPropertyOptional({ description: 'Receive promotional push notifications' })
  @IsBoolean()
  @IsOptional()
  pushPromotional?: boolean;

  @ApiPropertyOptional({ description: 'Receive review request push notifications' })
  @IsBoolean()
  @IsOptional()
  pushReview?: boolean;

  @ApiPropertyOptional({ description: 'Receive system push notifications' })
  @IsBoolean()
  @IsOptional()
  pushSystem?: boolean;

  @ApiPropertyOptional({ description: 'Receive earnings push notifications' })
  @IsBoolean()
  @IsOptional()
  pushEarnings?: boolean;


  // ── IN-APP PREFERENCES ──

  @ApiPropertyOptional({ description: 'Show order status updates in-app' })
  @IsBoolean()
  @IsOptional()
  inAppOrderStatus?: boolean;

  @ApiPropertyOptional({ description: 'Show notifications for new orders in-app' })
  @IsBoolean()
  @IsOptional()
  inAppNewOrder?: boolean;

  @ApiPropertyOptional({ description: 'Show delivery status updates in-app' })
  @IsBoolean()
  @IsOptional()
  inAppDeliveryUpdate?: boolean;

  @ApiPropertyOptional({ description: 'Show promotional notifications in-app' })
  @IsBoolean()
  @IsOptional()
  inAppPromotional?: boolean;

  @ApiPropertyOptional({ description: 'Show review request notifications in-app' })
  @IsBoolean()
  @IsOptional()
  inAppReview?: boolean;

  @ApiPropertyOptional({ description: 'Show system notifications in-app' })
  @IsBoolean()
  @IsOptional()
  inAppSystem?: boolean;

  @ApiPropertyOptional({ description: 'Show earnings notifications in-app' })
  @IsBoolean()
  @IsOptional()
  inAppEarnings?: boolean;
}