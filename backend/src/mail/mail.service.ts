import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import { Review } from '../reviews/entities/review.entity';
import { UserRole } from '../users/entities/user.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class MailService {
  private transporter: Transporter;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();

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
    
    // Load all Handlebars templates
    this.loadTemplates();
  }

  private loadTemplates() {
    // ✅ FIXED: Multiple path resolution attempts
    let templatesDir = path.join(__dirname, 'templates');
    
    // Check if templates exist, try alternative paths
    if (!fs.existsSync(templatesDir)) {
      const alternativePaths = [
        path.join(process.cwd(), 'dist', 'mail', 'templates'),
        path.join(process.cwd(), 'src', 'mail', 'templates'),
        path.join(__dirname, '..', 'mail', 'templates'),
      ];
      
      for (const altPath of alternativePaths) {
        if (fs.existsSync(altPath)) {
          templatesDir = altPath;
          console.log(`✅ Found templates at: ${templatesDir}`);
          break;
        }
      }
    }
    
    if (!fs.existsSync(templatesDir)) {
      console.error(`❌ Templates directory not found at: ${templatesDir}`);
      return;
    }
    
    const templateFiles = [
      'application-approved',
      'application-rejected',
      'earnings-added-agent',
      'new-order-available-agent',
      'new-order-owner',
      'order-confirmation',
      'order-delivered',
      'order-status-update',
      'password-reset',
      'review-notification',
    ];

    templateFiles.forEach(file => {
      const templatePath = path.join(templatesDir, `${file}.hbs`);
      
      // ✅ FIXED: Check if file exists before reading
      if (fs.existsSync(templatePath)) {
        try {
          const templateContent = fs.readFileSync(templatePath, 'utf-8');
          this.templates.set(file, Handlebars.compile(templateContent));
          console.log(`✅ Loaded template: ${file}`);
        } catch (error) {
          console.error(`❌ Failed to load template ${file}:`, error.message);
        }
      } else {
        console.warn(`⚠️ Template not found: ${templatePath}`);
      }
    });
  }

  // Helper to get status text
  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: 'Pending',
      preparing: 'Preparing',
      ready: 'Ready',
      picked_up: 'Picked Up',
      on_the_way: 'On The Way',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return statusMap[status] || status;
  }

  // ==================== AGENT EMAILS ====================

  async sendNewOrderAvailableToAgent(agent: User, order: Order, earnings: number) {
    const template = this.templates.get('new-order-available-agent');
    
    if (!template) {
      console.error('Template new-order-available-agent not found');
      return;
    }
    
    const html = template({
      logoUrl: `${this.configService.get('FRONTEND_URL')}/logo.png`,
      agentName: agent.fullName,
      earnings: earnings,
      orderId: order.id.slice(-8).toUpperCase(),
      restaurantName: order.restaurant.name,
      restaurantAddress: order.restaurant.address,
      deliveryAddress: order.deliveryAddress,
      distance: ((Math.random() * 5) + 1).toFixed(1),
      acceptUrl: `${this.configService.get('FRONTEND_URL')}/agent/orders/${order.id}`,
      year: new Date().getFullYear(),
    });

    await this.transporter.sendMail({
      from: `"QuickBite" <${this.configService.get<string>('MAIL_FROM')}>`,
      to: agent.email,
      subject: `🍕 New Order Available! - #${order.id.slice(-8).toUpperCase()}`,
      html: html,
    });
  }

  async sendEarningsAddedToAgent(agent: User, order: Order, earnings: number, totalEarnings: number, deliveriesCount: number, avgRating: number = 4.5) {
    const template = this.templates.get('earnings-added-agent');
    
    if (!template) {
      console.error('Template earnings-added-agent not found');
      return;
    }
    
    const html = template({
      logoUrl: `${this.configService.get('FRONTEND_URL')}/logo.png`,
      agentName: agent.fullName,
      earnings: earnings,
      totalEarnings: totalEarnings,
      deliveriesCount: deliveriesCount,
      avgRating: avgRating,
      orderId: order.id.slice(-8).toUpperCase(),
      restaurantName: order.restaurant.name,
      deliveryAddress: order.deliveryAddress,
      earningsUrl: `${this.configService.get('FRONTEND_URL')}/agent/earnings`,
      year: new Date().getFullYear(),
    });

    await this.transporter.sendMail({
      from: `"QuickBite" <${this.configService.get<string>('MAIL_FROM')}>`,
      to: agent.email,
      subject: `💰 You earned ৳${earnings} for delivery #${order.id.slice(-8).toUpperCase()}`,
      html: html,
    });
  }

  async sendOrderAssignedToAgent(agent: User, order: Order) {
    const template = this.templates.get('new-order-available-agent');
    
    if (!template) {
      console.error('Template new-order-available-agent not found');
      return;
    }
    
    const html = template({
      logoUrl: `${this.configService.get('FRONTEND_URL')}/logo.png`,
      agentName: agent.fullName,
      earnings: order.deliveryFee,
      orderId: order.id.slice(-8).toUpperCase(),
      restaurantName: order.restaurant.name,
      restaurantAddress: order.restaurant.address,
      deliveryAddress: order.deliveryAddress,
      distance: ((Math.random() * 5) + 1).toFixed(1),
      acceptUrl: `${this.configService.get('FRONTEND_URL')}/agent/orders/${order.id}`,
      year: new Date().getFullYear(),
    });

    await this.transporter.sendMail({
      from: `"QuickBite" <${this.configService.get<string>('MAIL_FROM')}>`,
      to: agent.email,
      subject: `✅ Order Assigned - #${order.id.slice(-8).toUpperCase()}`,
      html: html,
    });
  }

  // ==================== EXISTING EMAILS ====================

  async sendPasswordResetEmail(email: string, token: string, fullName: string = 'User') {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    const template = this.templates.get('password-reset');
    
    if (!template) {
      console.error('Template password-reset not found');
      return;
    }
    
    const html = template({
      logoUrl: `${frontendUrl}/logo.png`,
      fullName: fullName,
      resetUrl: resetUrl,
      year: new Date().getFullYear(),
    });

    await this.transporter.sendMail({
      from: `"QuickBite" <${this.configService.get<string>('MAIL_FROM')}>`,
      to: email,
      subject: 'Reset Your QuickBite Password',
      html: html,
    });
  }

  async sendOrderConfirmation(order: Order) {
    const template = this.templates.get('order-confirmation');
    
    if (!template) {
      console.error('Template order-confirmation not found');
      return;
    }
    
    const items = order.items?.map(item => ({
      name: item.menuItem?.name || 'Item',
      quantity: item.quantity,
      price: item.unitPrice,
    })) || [];

    const html = template({
      logoUrl: `${this.configService.get('FRONTEND_URL')}/logo.png`,
      customerName: order.customer?.fullName || order.customerName || 'Customer',
      orderId: order.id.slice(-8).toUpperCase(),
      restaurantName: order.restaurant?.name || 'Restaurant',
      restaurantAddress: order.restaurant?.address || '',
      restaurantPhone: order.restaurant?.phone || '',
      items: items,
      totalAmount: order.totalAmount,
      deliveryAddress: order.deliveryAddress,
      trackingUrl: `${this.configService.get('FRONTEND_URL')}/orders/${order.id}`,
      customerEmail: order.customer?.email || order.customerEmail || '',
      year: new Date().getFullYear(),
    });

    await this.transporter.sendMail({
      from: `"QuickBite" <${this.configService.get<string>('MAIL_FROM')}>`,
      to: order.customer?.email || order.customerEmail,
      subject: `Order Confirmed! - #${order.id.slice(-8).toUpperCase()}`,
      html: html,
    });
  }

  async sendOrderStatusUpdate(order: Order) {
    const template = this.templates.get('order-status-update');
    
    if (!template) {
      console.error('Template order-status-update not found');
      return;
    }
    
    const html = template({
      logoUrl: `${this.configService.get('FRONTEND_URL')}/logo.png`,
      customerName: order.customer?.fullName || order.customerName || 'Customer',
      orderId: order.id.slice(-8).toUpperCase(),
      status: order.status,
      statusText: this.getStatusText(order.status),
      restaurantName: order.restaurant?.name || 'Restaurant',
      totalAmount: order.totalAmount,
      agentName: order.agent?.fullName,
      agentPhone: order.agent?.phone,
      trackingUrl: `${this.configService.get('FRONTEND_URL')}/orders/${order.id}`,
      year: new Date().getFullYear(),
    });

    await this.transporter.sendMail({
      from: `"QuickBite" <${this.configService.get<string>('MAIL_FROM')}>`,
      to: order.customer?.email || order.customerEmail,
      subject: `Order ${this.getStatusText(order.status)} - #${order.id.slice(-8).toUpperCase()}`,
      html: html,
    });
  }

  async sendOrderDelivered(order: Order) {
    const template = this.templates.get('order-delivered');
    
    if (!template) {
      console.error('Template order-delivered not found');
      return;
    }
    
    const html = template({
      logoUrl: `${this.configService.get('FRONTEND_URL')}/logo.png`,
      customerName: order.customer?.fullName || order.customerName || 'Customer',
      orderId: order.id.slice(-8).toUpperCase(),
      restaurantName: order.restaurant?.name || 'Restaurant',
      totalAmount: order.totalAmount,
      deliveryAddress: order.deliveryAddress,
      agentName: order.agent?.fullName,
      agentPhone: order.agent?.phone,
      reviewUrl: `${this.configService.get('FRONTEND_URL')}/orders/${order.id}/review`,
      orderAgainUrl: `${this.configService.get('FRONTEND_URL')}/restaurants/${order.restaurantId}`,
      year: new Date().getFullYear(),
    });

    await this.transporter.sendMail({
      from: `"QuickBite" <${this.configService.get<string>('MAIL_FROM')}>`,
      to: order.customer?.email || order.customerEmail,
      subject: `Order Delivered! - #${order.id.slice(-8).toUpperCase()}`,
      html: html,
    });
  }

  async sendNewReviewNotification(review: Review, restaurantOwnerEmail: string) {
    const template = this.templates.get('review-notification');
    
    if (!template) {
      console.error('Template review-notification not found');
      return;
    }
    
    const getInitials = (name: string) => {
      return name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
    };

    const html = template({
      logoUrl: `${this.configService.get('FRONTEND_URL')}/logo.png`,
      ownerName: review.restaurant?.owner?.fullName || 'Owner',
      restaurantName: review.restaurant?.name || 'Restaurant',
      customerName: review.customer?.fullName || 'Customer',
      rating: review.rating,
      reviewComment: review.comment,
      reviewDate: review.createdAt,
      orderId: review.order?.id?.slice(-8).toUpperCase() || 'N/A',
      avgRating: 4.5,
      reviewCount: 127,
      dashboardUrl: `${this.configService.get('FRONTEND_URL')}/owner/reviews`,
      year: new Date().getFullYear(),
    });

    await this.transporter.sendMail({
      from: `"QuickBite" <${this.configService.get<string>('MAIL_FROM')}>`,
      to: restaurantOwnerEmail,
      subject: `New ${review.rating}⭐ Review for ${review.restaurant?.name}`,
      html: html,
    });
  }

  async sendApprovalEmail(user: User, role: UserRole, notes?: string) {
    const template = this.templates.get('application-approved');
    
    if (!template) {
      console.error('Template application-approved not found');
      return;
    }
    
    const roleText = role === UserRole.OWNER ? 'Restaurant Owner' : 'Delivery Agent';
    
    const html = template({
      logoUrl: `${this.configService.get('FRONTEND_URL')}/logo.png`,
      fullName: user.fullName,
      roleText: roleText,
      notes: notes,
      loginUrl: `${this.configService.get('FRONTEND_URL')}/login`,
      year: new Date().getFullYear(),
    });

    await this.transporter.sendMail({
      from: `"QuickBite" <${this.configService.get<string>('MAIL_FROM')}>`,
      to: user.email,
      subject: `QuickBite - ${roleText} Application Approved 🎉`,
      html: html,
    });
  }

  async sendRejectionEmail(user: User, reason?: string) {
    const template = this.templates.get('application-rejected');
    
    if (!template) {
      console.error('Template application-rejected not found');
      return;
    }
    
    const roleText = user.role === UserRole.OWNER ? 'Restaurant Owner' : 'Delivery Agent';
    
    const html = template({
      logoUrl: `${this.configService.get('FRONTEND_URL')}/logo.png`,
      fullName: user.fullName,
      roleText: roleText,
      reason: reason,
      supportUrl: `${this.configService.get('FRONTEND_URL')}/support`,
      year: new Date().getFullYear(),
    });

    await this.transporter.sendMail({
      from: `"QuickBite" <${this.configService.get<string>('MAIL_FROM')}>`,
      to: user.email,
      subject: 'QuickBite - Application Update',
      html: html,
    });
  }

  async sendNewOrderToOwner(order: Order, ownerEmail: string) {
    const template = this.templates.get('new-order-owner');
    
    if (!template) {
      console.error('Template new-order-owner not found');
      return;
    }
    
    const items = order.items?.map(item => ({
      name: item.menuItem?.name || 'Item',
      quantity: item.quantity,
      price: item.unitPrice,
    })) || [];

    const html = template({
      logoUrl: `${this.configService.get('FRONTEND_URL')}/logo.png`,
      ownerName: order.restaurant?.owner?.fullName || 'Owner',
      orderId: order.id.slice(-8).toUpperCase(),
      restaurantName: order.restaurant?.name || 'Restaurant',
      customerName: order.customer?.fullName || order.customerName || 'Customer',
      customerPhone: order.customer?.phone || order.customerPhone || 'Not provided',
      deliveryAddress: order.deliveryAddress,
      orderTime: new Date(order.placedAt).toLocaleString(),
      items: items,
      totalAmount: order.totalAmount,
      dashboardUrl: `${this.configService.get('FRONTEND_URL')}/owner/orders/${order.id}`,
      year: new Date().getFullYear(),
    });

    await this.transporter.sendMail({
      from: `"QuickBite" <${this.configService.get<string>('MAIL_FROM')}>`,
      to: ownerEmail,
      subject: `📋 New Order Received! - #${order.id.slice(-8).toUpperCase()}`,
      html: html,
    });
  }
}