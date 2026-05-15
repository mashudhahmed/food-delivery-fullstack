// frontend/app/lib/websocket.ts - Polling Only (No WebSocket)

import { useNotificationStore } from '@/app/stores/notificationStore';
import { api } from './api';

class WebSocketService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling = false;

  connect(userId: string) {
    if (this.isPolling) {
      console.log('Polling already active');
      return;
    }
    
    console.log('Starting notification polling for user:', userId);
    this.startPolling();
  }

  private startPolling() {
    this.isPolling = true;
    
    // Initial fetch immediately
    this.fetchNotifications();
    
    // Then poll every 10 seconds
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
      
      console.log(`Polling: ${notifications.length} notifications, ${unreadCount} unread`);
    } catch (error) {
      console.error('Polling error:', error);
    }
  }

  disconnect() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    console.log('Notification polling stopped');
  }
}

export const wsService = new WebSocketService();