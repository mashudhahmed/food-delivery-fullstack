import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://project-quickbite.vercel.app',
      process.env.FRONTEND_URL,
    ].filter(Boolean),
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private connectedClients = new Map<string, string>(); // socketId → userId

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  afterInit() {
    this.logger.log('Notifications WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect(true);
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub;

      // Store mapping
      this.connectedClients.set(client.id, userId);
      client.data.userId = userId;

      // Join private room
      client.join(`user_${userId}`);

      this.logger.log(`User ${userId} connected (socket: ${client.id})`);
      client.emit('connected', {
        message: 'Successfully connected to notification server',
        userId,
      });
    } catch (err) {
      this.logger.warn(`WebSocket connection rejected: ${err.message}`);
      client.emit('error', { message: 'Invalid or expired token' });
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.connectedClients.get(client.id);
    this.connectedClients.delete(client.id);

    if (userId) {
      this.logger.log(`User ${userId} disconnected (socket: ${client.id})`);
    }
  }

  // ─────────────────────────────────────────────
  // Public methods used by NotificationsService
  // ─────────────────────────────────────────────

  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification);
    this.logger.debug(`Notification sent to user ${userId}: ${notification.title}`);
  }

  sendNotificationToUsers(userIds: string[], notification: any) {
    userIds.forEach((userId) => {
      this.server.to(`user_${userId}`).emit('notification', notification);
    });
  }

  broadcastToAll(notification: any) {
    this.server.emit('notification', notification);
  }

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────

  private extractToken(client: Socket): string | null {
    // Preferred: handshake.auth.token
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    // Header
    const authHeader = client.handshake.headers?.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    // Query fallback (less secure)
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }

    return null;
  }
}