import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPreference } from './entities/notification-preference.entity';
import { UpdateNotificationPreferencesDto } from './dto/update-notification-preferences.dto';

@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(NotificationPreference)
    private readonly preferenceRepository: Repository<NotificationPreference>,
  ) {}

  /**
   * Get user's notification preferences
   */
  async getPreferences(userId: string): Promise<NotificationPreference> {
    let preferences = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    return preferences;
  }

  /**
   * Create default preferences for a user
   */
  async createDefaultPreferences(userId: string): Promise<NotificationPreference> {
    const preferences = this.preferenceRepository.create({
      userId,
      emailOrderStatus: true,
      emailNewOrder: true,
      emailDeliveryUpdate: true,
      emailPromotional: false,
      emailReview: true,
      emailSystem: true,
      emailEarnings: true,
      pushOrderStatus: true,
      pushNewOrder: true,
      pushDeliveryUpdate: true,
      pushPromotional: false,
      pushReview: true,
      pushSystem: true,
      pushEarnings: true,
      inAppOrderStatus: true,
      inAppNewOrder: true,
      inAppDeliveryUpdate: true,
      inAppPromotional: false,
      inAppReview: true,
      inAppSystem: true,
      inAppEarnings: true,
    });

    return await this.preferenceRepository.save(preferences);
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreference> {
    let preferences = await this.preferenceRepository.findOne({
      where: { userId },
    });

    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId);
    }

    // Update only provided fields
    Object.keys(dto).forEach((key) => {
      if (dto[key] !== undefined) {
        preferences[key] = dto[key];
      }
    });

    return await this.preferenceRepository.save(preferences);
  }

  /**
   * Check if a specific notification type is enabled for a user
   */
  async isNotificationEnabled(
    userId: string,
    type: string,
    channel: 'email' | 'push' | 'inApp',
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    const key = `${channel}${type.charAt(0).toUpperCase() + type.slice(1)}`;
    return preferences[key] ?? true;
  }

  /**
   * Get notification preferences for a specific channel
   */
  async getChannelPreferences(userId: string, channel: 'email' | 'push' | 'inApp') {
    const preferences = await this.getPreferences(userId);
    const prefix = channel;
    const result: Record<string, boolean> = {};

    Object.keys(preferences).forEach((key) => {
      if (key.startsWith(prefix) && typeof preferences[key] === 'boolean') {
        result[key] = preferences[key];
      }
    });

    return result;
  }
}