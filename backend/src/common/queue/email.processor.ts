import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MailService } from '../../mail/mail.service';

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailService: MailService) {}

  @Process('send-order-confirmation')
  async handleOrderConfirmation(job: Job<{ order: any }>) {
    this.logger.debug(`Processing order confirmation email for order ${job.data.order.id}`);
    try {
      await this.mailService.sendOrderConfirmation(job.data.order);
      this.logger.debug(`Order confirmation email sent for order ${job.data.order.id}`);
    } catch (error) {
      this.logger.error(`Failed to send order confirmation email: ${error.message}`);
      throw error;
    }
  }

  @Process('send-order-status-update')
  async handleOrderStatusUpdate(job: Job<{ order: any }>) {
    this.logger.debug(`Processing order status update email for order ${job.data.order.id}`);
    try {
      await this.mailService.sendOrderStatusUpdate(job.data.order);
      this.logger.debug(`Order status update email sent for order ${job.data.order.id}`);
    } catch (error) {
      this.logger.error(`Failed to send order status update email: ${error.message}`);
      throw error;
    }
  }

  @Process('send-order-delivered')
  async handleOrderDelivered(job: Job<{ order: any }>) {
    this.logger.debug(`Processing order delivered email for order ${job.data.order.id}`);
    try {
      await this.mailService.sendOrderDelivered(job.data.order);
      this.logger.debug(`Order delivered email sent for order ${job.data.order.id}`);
    } catch (error) {
      this.logger.error(`Failed to send order delivered email: ${error.message}`);
      throw error;
    }
  }

  @Process('send-new-order-owner')
  async handleNewOrderOwner(job: Job<{ order: any; ownerEmail: string }>) {
    this.logger.debug(`Processing new order owner email for order ${job.data.order.id}`);
    try {
      await this.mailService.sendNewOrderToOwner(job.data.order, job.data.ownerEmail);
      this.logger.debug(`New order owner email sent for order ${job.data.order.id}`);
    } catch (error) {
      this.logger.error(`Failed to send new order owner email: ${error.message}`);
      throw error;
    }
  }

  @Process('send-new-order-available-agent')
  async handleNewOrderAvailableAgent(job: Job<{ agent: any; order: any; earnings: number }>) {
    this.logger.debug(`Processing new order available agent email for order ${job.data.order.id}`);
    try {
      await this.mailService.sendNewOrderAvailableToAgent(
        job.data.agent,
        job.data.order,
        job.data.earnings,
      );
      this.logger.debug(`New order available agent email sent for order ${job.data.order.id}`);
    } catch (error) {
      this.logger.error(`Failed to send new order available agent email: ${error.message}`);
      throw error;
    }
  }

  @Process('send-earnings-added-agent')
  async handleEarningsAddedAgent(job: Job<{
    agent: any;
    order: any;
    earnings: number;
    totalEarnings: number;
    deliveriesCount: number;
    avgRating: number;
  }>) {
    this.logger.debug(`Processing earnings added agent email for order ${job.data.order.id}`);
    try {
      await this.mailService.sendEarningsAddedToAgent(
        job.data.agent,
        job.data.order,
        job.data.earnings,
        job.data.totalEarnings,
        job.data.deliveriesCount,
        job.data.avgRating,
      );
      this.logger.debug(`Earnings added agent email sent for order ${job.data.order.id}`);
    } catch (error) {
      this.logger.error(`Failed to send earnings added agent email: ${error.message}`);
      throw error;
    }
  }

  @Process('send-password-reset')
  async handlePasswordReset(job: Job<{ email: string; token: string; fullName: string }>) {
    this.logger.debug(`Processing password reset email for ${job.data.email}`);
    try {
      await this.mailService.sendPasswordResetEmail(
        job.data.email,
        job.data.token,
        job.data.fullName,
      );
      this.logger.debug(`Password reset email sent for ${job.data.email}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email: ${error.message}`);
      throw error;
    }
  }

  @Process('send-review-notification')
  async handleReviewNotification(job: Job<{ review: any; restaurantOwnerEmail: string }>) {
    this.logger.debug(`Processing review notification email for review ${job.data.review.id}`);
    try {
      await this.mailService.sendNewReviewNotification(
        job.data.review,
        job.data.restaurantOwnerEmail,
      );
      this.logger.debug(`Review notification email sent for review ${job.data.review.id}`);
    } catch (error) {
      this.logger.error(`Failed to send review notification email: ${error.message}`);
      throw error;
    }
  }

  @Process('send-approval-email')
  async handleApprovalEmail(job: Job<{ user: any; role: string; notes?: string }>) {
    this.logger.debug(`Processing approval email for user ${job.data.user.email}`);
    try {
      await this.mailService.sendApprovalEmail(
        job.data.user,
        job.data.role as any,
        job.data.notes,
      );
      this.logger.debug(`Approval email sent for user ${job.data.user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send approval email: ${error.message}`);
      throw error;
    }
  }

  @Process('send-rejection-email')
  async handleRejectionEmail(job: Job<{ user: any; reason: string }>) {
    this.logger.debug(`Processing rejection email for user ${job.data.user.email}`);
    try {
      await this.mailService.sendRejectionEmail(
        job.data.user,
        job.data.reason,
      );
      this.logger.debug(`Rejection email sent for user ${job.data.user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send rejection email: ${error.message}`);
      throw error;
    }
  }

  @Process('send-email-change-verification')
  async handleEmailChangeVerification(job: Job<{ email: string; token: string; fullName: string }>) {
    this.logger.debug(`Processing email change verification for ${job.data.email}`);
    try {
      await this.mailService.sendEmailChangeVerification(
        job.data.email,
        job.data.token,
        job.data.fullName,
      );
      this.logger.debug(`Email change verification sent to ${job.data.email}`);
    } catch (error) {
      this.logger.error(`Failed to send email change verification: ${error.message}`);
      throw error;
    }
  }

  @Process('send-email-change-confirmation')
  async handleEmailChangeConfirmation(job: Job<{ email: string; fullName: string }>) {
    this.logger.debug(`Processing email change confirmation for ${job.data.email}`);
    try {
      await this.mailService.sendEmailChangeConfirmation(
        job.data.email,
        job.data.fullName,
      );
      this.logger.debug(`Email change confirmation sent to ${job.data.email}`);
    } catch (error) {
      this.logger.error(`Failed to send email change confirmation: ${error.message}`);
      throw error;
    }
  }
}