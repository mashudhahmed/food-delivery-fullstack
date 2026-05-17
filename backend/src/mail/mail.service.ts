import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Review } from '../reviews/entities/review.entity';
import { UserRole } from '../users/entities/user.entity';
import { User } from '../users/entities/user.entity';

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

  // ==================== AGENT EMAILS (NEW) ====================

  // 1. When new order becomes available for agents
  async sendNewOrderAvailableToAgent(agent: User, order: Order, earnings: number) {
    const emailContent = `
      🍕 New Order Available! 🍕
      
      Order #${order.id.slice(-8)} is ready for delivery!
      
      Restaurant: ${order.restaurant.name}
      Restaurant Address: ${order.restaurant.address}
      Delivery Address: ${order.deliveryAddress}
      Delivery Fee: ৳${earnings}
      
      Log in to your agent dashboard to accept this order.
      
      📱 QuickBite Agent App
    `;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: agent.email,
      subject: `🍕 New Order Available! - #${order.id.slice(-8)}`,
      text: emailContent,
    });
  }

  // 2. When order is assigned to agent
  async sendOrderAssignedToAgent(agent: User, order: Order) {
    const emailContent = `
      ✅ Order Assigned to You! ✅
      
      Order #${order.id.slice(-8)} has been assigned to you.
      
      Restaurant: ${order.restaurant.name}
      Restaurant Address: ${order.restaurant.address}
      Delivery Address: ${order.deliveryAddress}
      Customer: ${order.customerName}
      Customer Phone: ${order.customerPhone || 'Not provided'}
      
      Please pick up the order from the restaurant and deliver to the customer.
      
      📱 QuickBite Agent App
    `;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: agent.email,
      subject: `✅ Order Assigned - #${order.id.slice(-8)}`,
      text: emailContent,
    });
  }

  // 3. When agent earns money from delivery
  async sendEarningsAddedToAgent(agent: User, order: Order, earnings: number, totalEarnings: number) {
    const emailContent = `
      💰 Earnings Added! 💰
      
      You earned ৳${earnings} for delivering order #${order.id.slice(-8)}!
      
      Order Details:
      Restaurant: ${order.restaurant.name}
      Delivery to: ${order.deliveryAddress}
      
      Your total earnings: ৳${totalEarnings}
      
      Keep up the great work!
      
      📱 QuickBite Agent App
    `;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: agent.email,
      subject: `💰 You earned ৳${earnings} for delivery #${order.id.slice(-8)}`,
      text: emailContent,
    });
  }

  // 4. Send to all active agents (batch)
  async sendNewOrderAvailableToAllAgents(agents: User[], order: Order, earnings: number) {
    for (const agent of agents) {
      await this.sendNewOrderAvailableToAgent(agent, order, earnings);
    }
  }

  // ==================== EXISTING EMAILS ====================

  async sendPasswordResetEmail(email: string, token: string) {
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
      `${item.quantity}x ${item.menuItem.name} - ৳${(item.unitPrice * item.quantity).toFixed(2)}`
    ).join('\n');

    const emailContent = `
      Order Confirmed - #${order.id.slice(-8)}
      
      Thank you for your order!
      
      Restaurant: ${order.restaurant.name}
      Items:
      ${itemsList}
      
      Subtotal: ৳${order.subtotal}
      Delivery Fee: ৳${order.deliveryFee}
      Platform Fee: ৳${order.platformFee}
      Total Amount: ৳${order.totalAmount}
      
      Delivery Address: ${order.deliveryAddress}
      
      Estimated Delivery Time: 30-45 minutes
      
      You can track your order status in the app.
    `;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: order.customer.email,
      subject: `Order Confirmed - #${order.id.slice(-8)}`,
      text: emailContent,
    });
  }

  async sendOrderStatusUpdate(order: Order) {
    const statusMessages: Record<string, string> = {
      [OrderStatus.PREPARING]: 'Your order is being prepared!',
      [OrderStatus.READY]: 'Your order is ready for pickup!',
      [OrderStatus.PICKED_UP]: 'Your order has been picked up by the delivery agent!',
      [OrderStatus.ON_THE_WAY]: 'Your order is on the way!',
    };

    const message = statusMessages[order.status] || `Your order status is now: ${order.status}`;

    const emailContent = `
      Order Status Update - #${order.id.slice(-8)}
      
      ${message}
      
      Restaurant: ${order.restaurant.name}
      
      Track your order in the app for real-time updates.
    `;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: order.customer.email,
      subject: `Your Order is ${order.status.toUpperCase()} - #${order.id.slice(-8)}`,
      text: emailContent,
    });
  }

  async sendOrderDelivered(order: Order) {
    const emailContent = `
      Order Delivered! - #${order.id.slice(-8)}
      
      Your order has been successfully delivered!
      
      Restaurant: ${order.restaurant.name}
      Total Amount: ৳${order.totalAmount}
      
      We hope you enjoyed your meal!
      
      Thank you for choosing QuickBite!
    `;

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: order.customer.email,
      subject: `Order Delivered! - #${order.id.slice(-8)}`,
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
    const htmlContent = `...`; // Keep as is

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: email,
      subject: `QuickBite - ${roleText} Application Approved`,
      text: `Your application has been approved. You can now log in.`,
    });
  }

  async sendRejectionEmail(email: string, fullName: string, reason?: string) {
    const htmlContent = `...`; // Keep as is

    await this.transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM'),
      to: email,
      subject: 'QuickBite - Application Update',
      text: `Your application has been rejected. ${reason || ''}`,
    });
  }
}