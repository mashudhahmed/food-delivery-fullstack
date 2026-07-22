// stores/notificationStore.ts
import { create } from 'zustand';
import { Notification } from '@/types/notification';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

// ✅ Helper to ensure array
const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.notifications && Array.isArray(data.notifications)) return data.notifications;
  return [];
};

interface NotificationStore {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/notifications');
      
      // ✅ Ensure we have an array
      const rawData = response.data;
      const notifications = ensureArray(rawData);
      
      console.log('📥 Fetched notifications from store:', notifications.length);
      
      set({
        notifications,
        unreadCount: notifications.filter((n: Notification) => !n.read).length,
        loading: false,
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // ✅ Set empty array on error to prevent crashes
      set({ notifications: [], unreadCount: 0, loading: false });
    }
  },

  markAsRead: async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  },

  markAllAsRead: async () => {
    try {
      await api.patch('/notifications/read-all');
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  },

  addNotification: (notification: Notification) => {
    console.log('🔔🔔🔔 NEW NOTIFICATION RECEIVED:', notification);
    
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
    
    // Show toast notification
    toast.success(notification.title, {
      duration: 5000,
      icon: '🔔',
    });
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },
}));