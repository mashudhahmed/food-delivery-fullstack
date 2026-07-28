// src/notifications/notifications.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
      : true,
    credentials: true,
  },
})
@Injectable()
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  // socketId → userId
  private readonly connectedClients = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '') ||
        (client.handshake.query?.token as string);

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token → disconnect`);
        client.disconnect(true);
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.config.get<string>('JWT_SECRET'),
      });

      const userId = payload.sub || payload.id;

      if (!userId) {
        client.disconnect(true);
        return;
      }

      client.data.userId = userId;
      client.data.role = payload.role;

      // Private room for this user
      client.join(`user:${userId}`);

      this.connectedClients.set(client.id, userId);

      this.logger.log(
        `Client connected → userId: ${userId} | socket: ${client.id}`,
      );
    } catch (err) {
      this.logger.warn(`Invalid token from ${client.id} → disconnect`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.connectedClients.get(client.id);
    this.connectedClients.delete(client.id);

    if (userId) {
      this.logger.log(`Client disconnected → userId: ${userId}`);
    }
  }

  /**
   * Main method used by NotificationsService
   * (matches the existing call: sendNotificationToUser)
   */
  sendNotificationToUser(userId: string, payload: any) {
    this.server.to(`user:${userId}`).emit('notification', payload);
  }

  /**
   * Alias / helper used in other places
   */
  notifyUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  /**
   * Notify multiple users
   */
  notifyUsers(userIds: string[], event: string, data: any) {
    userIds.forEach((id) => this.notifyUser(id, event, data));
  }

  /**
   * Broadcast to all connected clients (use carefully)
   */
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', data: { timestamp: Date.now() } };
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() room: string,
  ) {
    if (!client.data.userId) return;
    client.join(room);
    return { event: 'joined', data: { room } };
  }
}