import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Review } from '../reviews/entities/review.entity';

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
}