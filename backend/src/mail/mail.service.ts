import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Review } from '../reviews/entities/review.entity';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class MailService {
  private transporter: Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.configService.get<number>('MAIL_PORT'),
      secure: false,
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  async sendPasswordResetEmail(email: string, token: string) {
    // IMPORTANT: Use FRONTEND_URL for reset links (not backend API)
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ea580c; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background: #ea580c; color: white; text-decoration: none; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>QuickBite</h2>
          </div>
          <div class="content">
            <h3>Reset Your Password</h3>
            <p>You requested to reset your password for your QuickBite account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy this link: <a href="${resetUrl}">${resetUrl}</a></p>
            <p>This link expires in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2026 QuickBite. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: email,
      subject: 'Reset Your QuickBite Password',
      html: htmlContent,
      text: `Reset your password: ${resetUrl}`,
    });
  }

  async sendOrderConfirmation(order: Order) {
    const itemsList = order.items.map(item => 
      `${item.quantity}x ${item.menuItem.name} - $${(item.unitPrice * item.quantity).toFixed(2)}`
    ).join('\n');

    const emailContent = `
      Order Confirmed - #${order.id}
      
      Thank you for your order!
      
      Restaurant: ${order.restaurant.name}
      Items:
      ${itemsList}
      
      Total Amount: $${order.totalAmount.toFixed(2)}
      Delivery Address: ${order.deliveryAddress}
      
      Estimated Delivery Time: 30-45 minutes
      
      You can track your order status in the app.
    `;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: order.customer.email,
      subject: `Order Confirmed - #${order.id}`,
      text: emailContent,
    });
  }

  async sendOrderStatusUpdate(order: Order) {
    const statusMessages: Record<string, string> = {
      [OrderStatus.PREPARING]: 'Your order is being prepared!',
      [OrderStatus.READY]: 'Your order is ready for pickup!',
      [OrderStatus.PICKED_UP]: 'Your order has been picked up by the delivery agent!',
    };

    const message = statusMessages[order.status] || `Your order status is now: ${order.status}`;
    const agentName = order.agent ? order.agent.fullName : 'our delivery partner';

    const emailContent = `
      Order Status Update - #${order.id}
      
      ${message}
      
      Restaurant: ${order.restaurant.name}
      ${order.agent ? `Delivery Agent: ${agentName}` : ''}
      
      Track your order in the app for real-time updates.
    `;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: order.customer.email,
      subject: `Your Order is ${order.status.toUpperCase()} - #${order.id}`,
      text: emailContent,
    });
  }

  async sendOrderDelivered(order: Order) {
    const emailContent = `
      Order Delivered! - #${order.id}
      
      Your order has been successfully delivered!
      
      Restaurant: ${order.restaurant.name}
      Total Amount: $${order.totalAmount.toFixed(2)}
      
      We hope you enjoyed your meal!
      
      Please leave a review for ${order.restaurant.name}:
      [Link to leave review]
      
      Thank you for choosing QuickBite!
    `;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: order.customer.email,
      subject: `Order Delivered! - #${order.id}`,
      text: emailContent,
    });
  }

  async sendNewReviewNotification(review: Review, restaurantOwnerEmail: string) {
    const emailContent = `
      New Review for ${review.restaurant.name}
      
      Rating: ${review.rating}/5
      Comment: "${review.comment}"
      
      Reviewer: ${review.customer.fullName}
      
      Log in to your dashboard to view all reviews.
    `;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: restaurantOwnerEmail,
      subject: `New Review for ${review.restaurant.name}`,
      text: emailContent,
    });
  }

  async sendApprovalEmail(email: string, fullName: string, role: UserRole, notes?: string) {
    const roleText = role === UserRole.OWNER ? 'Restaurant Owner' : 'Delivery Agent';
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ea580c; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>QuickBite</h2>
          </div>
          <div class="content">
            <h3>Congratulations, ${fullName}!</h3>
            <p>Your application to become a ${roleText} has been <strong>APPROVED</strong>.</p>
            ${notes ? `<p><strong>Notes from admin:</strong> ${notes}</p>` : ''}
            <p>You can now log in to your account and start using the platform.</p>
            <p>Welcome to QuickBite!</p>
          </div>
          <div class="footer">
            <p>© 2026 QuickBite. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: email,
      subject: `QuickBite - ${roleText} Application Approved`,
      html: htmlContent,
      text: `Your application has been approved. You can now log in.`,
    });
  }

  async sendRejectionEmail(email: string, fullName: string, reason?: string) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>QuickBite</h2>
          </div>
          <div class="content">
            <h3>Dear ${fullName},</h3>
            <p>We regret to inform you that your application has been <strong>REJECTED</strong>.</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>If you have any questions, please contact our support team.</p>
          </div>
          <div class="footer">
            <p>© 2026 QuickBite. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: email,
      subject: 'QuickBite - Application Update',
      html: htmlContent,
      text: `Your application has been rejected. ${reason || ''}`,
    });
  }
}