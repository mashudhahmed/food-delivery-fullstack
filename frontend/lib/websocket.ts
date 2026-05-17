import { io, Socket } from 'socket.io-client';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { Notification } from '@/app/types/notification';
import { api } from './api';

class WebSocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;

  connect(userId: string) {
    this.userId = userId;
    const token = localStorage.getItem('token');
    
    // 1. Start polling as fallback
    this.startPolling();
    
    // 2. Try WebSocket connection
    try {
      this.socket = io('http://localhost:3002/notifications', {
        query: { userId },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('✅ WebSocket connected for instant notifications');
      });

      this.socket.on('connected', (data) => {
        console.log('Connected to notification server:', data);
      });

      this.socket.on('notification', (data: any) => {
        console.log('🔔 INSTANT notification received via WebSocket!', data);
        
        const notification: Notification = {
          id: data.id,
          type: data.type,
          title: data.title,
          message: data.message,
          read: data.read || false,
          createdAt: data.createdAt || new Date(),
          data: data.data,
        };
        
        // Add to store and show toast
        useNotificationStore.getState().addNotification(notification);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        console.log('WebSocket connection error, using polling only:', error.message);
      });
    } catch (error) {
      console.log('WebSocket not available, using polling only');
    }
  }

  private startPolling() {
    // Poll every 10 seconds as fallback
    this.fetchNotifications();
    this.pollingInterval = setInterval(() => {
      this.fetchNotifications();
    }, 10000);
  }

  private async fetchNotifications() {
    try {
      const response = await api.get('/notifications');
      const notifications = response.data || [];
      const unreadCount = notifications.filter((n: any) => !n.read).length;
      
      const store = useNotificationStore.getState();
      store.notifications = notifications;
      store.unreadCount = unreadCount;
    } catch (error) {
      // Silent fail
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    console.log('WebSocket disconnected');
  }
}

export const wsService = new WebSocketService();