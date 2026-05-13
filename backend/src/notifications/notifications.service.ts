// backend/src/notifications/notifications.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationsGateway } from './notifications.gateway';

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
    private readonly notificationsGateway: NotificationsGateway,
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
    
    // Send real-time via WebSocket
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

  // Send notification to a user
  async sendToUser(userId: string, notification: NotificationData) {
    return this.saveNotification(userId, notification);
  }

  // Send notification to multiple users
  async sendToUsers(userIds: string[], notification: NotificationData) {
    const promises = userIds.map(userId => this.saveNotification(userId, notification));
    return Promise.all(promises);
  }

  // Order notifications
  async notifyOrderPlaced(customerId: string, orderId: string) {
    await this.sendToUser(customerId, {
      type: 'order_new',
      title: 'Order Placed!',
      message: `Your order #${orderId.slice(-8)} has been placed successfully.`,
      data: { orderId },
    });
  }

  async notifyOrderStatusUpdate(customerId: string, orderId: string, status: string) {
    const statusMessages: Record<string, { title: string; message: string }> = {
      preparing: { title: 'Order Being Prepared', message: `Your order #${orderId.slice(-8)} is now being prepared.` },
      ready: { title: 'Order Ready', message: `Your order #${orderId.slice(-8)} is ready for pickup!` },
      picked_up: { title: 'Order Picked Up', message: `Your order #${orderId.slice(-8)} has been picked up by the delivery agent.` },
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

  // Restaurant notifications
  async notifyNewOrder(ownerId: string, orderId: string, restaurantName: string) {
    await this.sendToUser(ownerId, {
      type: 'order_new',
      title: 'New Order Received!',
      message: `New order #${orderId.slice(-8)} from ${restaurantName}`,
      data: { orderId },
    });
  }

  // Agent notifications
  async notifyNewDelivery(agentId: string, orderId: string) {
    await this.sendToUser(agentId, {
      type: 'agent_assigned',
      title: 'New Delivery Assignment',
      message: `New delivery order #${orderId.slice(-8)} is available.`,
      data: { orderId },
    });
  }
}