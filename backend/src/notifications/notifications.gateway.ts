// backend/src/notifications/notifications.gateway.ts

import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // Allow all origins for development
    credentials: true,
  },
  port: 3002, // Use a different port for WebSocket to avoid conflict
  namespace: 'notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients = new Map<string, string>();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    
    const userId = client.handshake.query.userId as string;
    
    if (userId) {
      this.connectedClients.set(client.id, userId);
      client.join(`user_${userId}`);
      console.log(`User ${userId} connected via socket`);
      client.emit('connected', { message: 'Connected to notification server' });
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  sendNotificationToUser(userId: string, notification: any) {
    this.server.to(`user_${userId}`).emit('notification', notification);
    console.log(`Notification sent to user ${userId}:`, notification.title);
  }

  sendNotificationToUsers(userIds: string[], notification: any) {
    userIds.forEach(userId => {
      this.server.to(`user_${userId}`).emit('notification', notification);
    });
  }

  broadcastToAll(notification: any) {
    this.server.emit('notification', notification);
  }
}