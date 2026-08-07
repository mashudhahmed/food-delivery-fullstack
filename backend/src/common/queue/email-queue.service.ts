import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Order } from '../../orders/entities/order.entity';
import { User } from '../../users/entities/user.entity';
import { Review } from '../../reviews/entities/review.entity';
import { NotificationPreferencesService } from '../../users/notification-preferences.service';

@Injectable()
export class EmailQueueService {
  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
    private readonly preferenceService: NotificationPreferencesService,
  ) {}

  async sendOrderConfirmation(order: Order): Promise<void> {
    // Check if customer has email notifications enabled
    if (order.customerId) {
      const isEnabled = await this.preferenceService.isNotificationEnabled(
        order.customerId,
        'order_status',
        'email',
      );
      if (!isEnabled) {
        return;
      }
    }

    await this.emailQueue.add(
      'send-order-confirmation',
      { order },
      {
        priority: 1,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  async sendOrderStatusUpdate(order: Order): Promise<void> {
    if (order.customerId) {
      const isEnabled = await this.preferenceService.isNotificationEnabled(
        order.customerId,
        'order_status',
        'email',
      );
      if (!isEnabled) {
        return;
      }
    }

    await this.emailQueue.add(
      'send-order-status-update',
      { order },
      {
        priority: 2,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  async sendOrderDelivered(order: Order): Promise<void> {
    if (order.customerId) {
      const isEnabled = await this.preferenceService.isNotificationEnabled(
        order.customerId,
        'order_status',
        'email',
      );
      if (!isEnabled) {
        return;
      }
    }

    await this.emailQueue.add(
      'send-order-delivered',
      { order },
      {
        priority: 2,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  async sendNewOrderToOwner(order: Order, ownerEmail: string): Promise<void> {
    // Check if owner has email notifications enabled
    if (order.restaurant?.ownerId) {
      const isEnabled = await this.preferenceService.isNotificationEnabled(
        order.restaurant.ownerId,
        'new_order',
        'email',
      );
      if (!isEnabled) {
        return;
      }
    }

    await this.emailQueue.add(
      'send-new-order-owner',
      { order, ownerEmail },
      {
        priority: 1,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  async sendNewOrderAvailableToAgent(agent: User, order: Order, earnings: number): Promise<void> {
    if (agent.id) {
      const isEnabled = await this.preferenceService.isNotificationEnabled(
        agent.id,
        'new_order',
        'email',
      );
      if (!isEnabled) {
        return;
      }
    }

    await this.emailQueue.add(
      'send-new-order-available-agent',
      { agent, order, earnings },
      {
        priority: 2,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  async sendEarningsAddedToAgent(
    agent: User,
    order: Order,
    earnings: number,
    totalEarnings: number,
    deliveriesCount: number,
    avgRating: number = 4.5,
  ): Promise<void> {
    if (agent.id) {
      const isEnabled = await this.preferenceService.isNotificationEnabled(
        agent.id,
        'earnings',
        'email',
      );
      if (!isEnabled) {
        return;
      }
    }

    await this.emailQueue.add(
      'send-earnings-added-agent',
      { agent, order, earnings, totalEarnings, deliveriesCount, avgRating },
      {
        priority: 3,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  async sendPasswordResetEmail(email: string, token: string, fullName: string): Promise<void> {
    await this.emailQueue.add(
      'send-password-reset',
      { email, token, fullName },
      {
        priority: 2,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  async sendNewReviewNotification(review: Review, restaurantOwnerEmail: string): Promise<void> {
    // Check if owner has email notifications enabled
    if (review.restaurant?.ownerId) {
      const isEnabled = await this.preferenceService.isNotificationEnabled(
        review.restaurant.ownerId,
        'review',
        'email',
      );
      if (!isEnabled) {
        return;
      }
    }

    await this.emailQueue.add(
      'send-review-notification',
      { review, restaurantOwnerEmail },
      {
        priority: 3,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  async sendApprovalEmail(user: User, role: string, notes?: string): Promise<void> {
    await this.emailQueue.add(
      'send-approval-email',
      { user, role, notes },
      {
        priority: 1,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  async sendRejectionEmail(user: User, reason: string): Promise<void> {
    await this.emailQueue.add(
      'send-rejection-email',
      { user, reason },
      {
        priority: 1,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  // ─────────────────────────────────────────────
  // EMAIL CHANGE
  // ─────────────────────────────────────────────

  async sendEmailChangeVerification(email: string, token: string, fullName: string): Promise<void> {
    await this.emailQueue.add(
      'send-email-change-verification',
      { email, token, fullName },
      {
        priority: 2,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  async sendEmailChangeConfirmation(email: string, fullName: string): Promise<void> {
    await this.emailQueue.add(
      'send-email-change-confirmation',
      { email, fullName },
      {
        priority: 2,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }

  async getQueueStatus(): Promise<any> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
      this.emailQueue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }
}