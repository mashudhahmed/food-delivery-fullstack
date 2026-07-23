// lib/websocket.ts
import { io, Socket } from 'socket.io-client';
import { useNotificationStore } from '@/stores/notificationStore';
import { Notification } from '@/types/notification';
import { api } from './api';

// ✅ Helper to ensure we always have an array
const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.notifications && Array.isArray(data.notifications)) return data.notifications;
  if (data?.results && Array.isArray(data.results)) return data.results;
  console.warn('⚠️ Unexpected data format in ensureArray:', typeof data, data);
  return [];
};

class WebSocketService {
  private socket: Socket | null = null;
  private userId: string | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling: boolean = false;

  connect(userId: string) {
    this.userId = userId;
    const token = localStorage.getItem('token');

    // 1. Start polling as fallback
    this.startPolling();

    // 2. Try WebSocket connection
    try {
      // ✅ Use environment variable for WebSocket URL
      const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
      const wsPath = process.env.NEXT_PUBLIC_WS_PATH || '/notifications';

      this.socket = io(WS_URL, {
        path: wsPath,
        query: { userId },
        // ✅ FIX: token was fetched but never passed to the handshake.
        // If the backend gateway validates a JWT on connect, every
        // connection was being rejected before this fix.
        auth: { token },
        // ✅ FIX: 'websocket'-only skips Socket.IO's normal polling
        // handshake and fails silently on some dev/proxy setups with
        // no useful error. Allow polling to establish the session,
        // then upgrade to websocket.
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        withCredentials: true,
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
          id: data.id || Date.now().toString(),
          type: data.type || 'system_alert',
          title: data.title || 'New Notification',
          message: data.message || '',
          read: data.read || false,
          createdAt: data.createdAt || new Date().toISOString(),
          data: data.data || {},
        };

        // Add to store and show toast
        const store = useNotificationStore.getState();
        store.addNotification(notification);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
      });

      this.socket.on('connect_error', (error) => {
        // ✅ Now logs the actual reason (e.g. "Invalid token",
        // "xhr poll error") instead of a bare failure, so future
        // connection issues are diagnosable from the console.
        console.log('WebSocket connection error, using polling only:', error.message);
      });
    } catch (error) {
      console.log('WebSocket not available, using polling only');
    }
  }

  private startPolling() {
    // ✅ Prevent multiple polling intervals
    if (this.isPolling) return;
    this.isPolling = true;

    // Poll every 10 seconds as fallback
    this.fetchNotifications();
    this.pollingInterval = setInterval(() => {
      this.fetchNotifications();
    }, 10000);
  }

  private async fetchNotifications() {
    try {
      const response = await api.get('/notifications');

      // ✅ Get the data and ensure it's an array
      const rawData = response.data;
      let notifications: any[] = ensureArray(rawData);

      console.log('🔵 Polling: Fetched notifications:', notifications.length);

      // Calculate unread count
      const unreadCount = notifications.filter((n: any) => !n.read).length;

      // Update store
      const store = useNotificationStore.getState();
      store.notifications = notifications;
      store.unreadCount = unreadCount;
    } catch (error) {
      // ✅ Silent fail - don't spam console with errors
      if (error instanceof Error && !error.message.includes('401')) {
        console.debug('Polling fetch failed:', error.message);
      }
    }
  }

  disconnect() {
    this.isPolling = false;

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