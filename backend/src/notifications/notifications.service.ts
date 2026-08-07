// backend/src/notifications/notifications.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationPreferencesService } from '../users/notification-preferences.service';

export interface NotificationData {
  type: string;
  title: string;
  message: string;
  data?: any;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly notificationsGateway: NotificationsGateway,
    private readonly preferenceService: NotificationPreferencesService,
  ) {}

  async getUserNotifications(userId: string) {
    return await this.notificationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async markAsRead(id: string, userId: string) {
    await this.notificationRepository.update(
      { id, userId },
      { read: true }
    );
    return { success: true };
  }

  async markAllAsRead(userId: string) {
    await this.notificationRepository.update(
      { userId, read: false },
      { read: true }
    );
    return { success: true };
  }

  async saveNotification(userId: string, notification: NotificationData) {
    // Check if user has enabled this notification type
    const isEnabled = await this.preferenceService.isNotificationEnabled(
      userId,
      notification.type,
      'inApp',
    );

    if (!isEnabled) {
      return null;
    }

    const newNotification = this.notificationRepository.create({
      userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data || {},
      read: false,
      createdAt: new Date(),
    });
    
    const saved = await this.notificationRepository.save(newNotification);
    
    this.notificationsGateway.sendNotificationToUser(userId, {
      id: saved.id,
      type: saved.type,
      title: saved.title,
      message: saved.message,
      data: saved.data,
      createdAt: saved.createdAt,
      read: saved.read,
    });
    
    return saved;
  }

  async sendToUser(userId: string, notification: NotificationData) {
    return this.saveNotification(userId, notification);
  }

  async sendToUsers(userIds: string[], notification: NotificationData) {
    const promises = userIds.map(userId => this.saveNotification(userId, notification));
    return Promise.all(promises);
  }

  async getActiveAgents(): Promise<User[]> {
    return await this.userRepository.find({
      where: { role: UserRole.AGENT },
    });
  }

  // When order is READY - Notify ALL available agents
  async notifyOrderReadyForAgents(orderId: string, restaurantName: string, earnings: number) {
    const agents = await this.getActiveAgents();
    
    console.log(`📢 Sending notification to ${agents.length} agents about order #${orderId.slice(-8)}`);
    
    for (const agent of agents) {
      // Check agent preferences
      const isEnabled = await this.preferenceService.isNotificationEnabled(
        agent.id,
        'new_order',
        'inApp',
      );

      if (isEnabled) {
        await this.sendToUser(agent.id, {
          type: 'order_available',
          title: '🍕 New Order Available!',
          message: `${restaurantName} • Earn ৳${earnings}`,
          data: { orderId, restaurantName, earnings },
        });
      }
    }
  }

  // Agent earnings notification
  async notifyAgentEarnings(agentId: string, orderId: string, earnings: number) {
    const isEnabled = await this.preferenceService.isNotificationEnabled(
      agentId,
      'earnings',
      'inApp',
    );

    if (isEnabled) {
      await this.sendToUser(agentId, {
        type: 'earnings_added',
        title: '💰 Earnings Added',
        message: `You earned ৳${earnings} for order #${orderId.slice(-8)}`,
        data: { orderId, earnings },
      });
    }
  }

  // ==================== EXISTING NOTIFICATIONS ====================

  async notifyOrderPlaced(customerId: string, orderId: string) {
    const isEnabled = await this.preferenceService.isNotificationEnabled(
      customerId,
      'order_status',
      'inApp',
    );

    if (isEnabled) {
      await this.sendToUser(customerId, {
        type: 'order_new',
        title: 'Order Placed!',
        message: `Your order #${orderId.slice(-8)} has been placed successfully.`,
        data: { orderId },
      });
    }
  }

  async notifyOrderStatusUpdate(customerId: string, orderId: string, status: string) {
    const isEnabled = await this.preferenceService.isNotificationEnabled(
      customerId,
      'order_status',
      'inApp',
    );

    if (!isEnabled) {
      return;
    }

    const statusMessages: Record<string, { title: string; message: string }> = {
      preparing: { title: 'Order Being Prepared', message: `Your order #${orderId.slice(-8)} is now being prepared.` },
      ready: { title: 'Order Ready', message: `Your order #${orderId.slice(-8)} is ready for pickup!` },
      picked_up: { title: 'Order Picked Up', message: `Your order #${orderId.slice(-8)} has been picked up by the delivery agent.` },
      on_the_way: { title: 'Order On The Way!', message: `Your order #${orderId.slice(-8)} is on its way to you!` },
      delivered: { title: 'Order Delivered', message: `Your order #${orderId.slice(-8)} has been delivered. Enjoy your meal!` },
      cancelled: { title: 'Order Cancelled', message: `Your order #${orderId.slice(-8)} has been cancelled.` },
    };

    const info = statusMessages[status] || { title: 'Order Updated', message: `Your order status is now ${status}` };
    
    await this.sendToUser(customerId, {
      type: 'order_status',
      title: info.title,
      message: info.message,
      data: { orderId, status },
    });
  }

  async notifyNewOrder(ownerId: string, orderId: string, restaurantName: string) {
    const isEnabled = await this.preferenceService.isNotificationEnabled(
      ownerId,
      'new_order',
      'inApp',
    );

    if (isEnabled) {
      await this.sendToUser(ownerId, {
        type: 'order_new',
        title: 'New Order Received!',
        message: `New order #${orderId.slice(-8)} from ${restaurantName}`,
        data: { orderId },
      });
    }
  }
}