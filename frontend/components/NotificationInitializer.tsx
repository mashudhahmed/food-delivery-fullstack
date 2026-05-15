// frontend/components/NotificationInitializer.tsx

'use client';

import { useEffect } from 'react';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { auth } from '@/app/lib/api';
import { wsService } from '@/app/lib/websocket';

export default function NotificationInitializer() {
  const { fetchNotifications } = useNotificationStore();

  useEffect(() => {
    const initializeNotifications = async () => {
      const token = localStorage.getItem('token');
      const user = auth.getCurrentUser();
      
      if (token && user) {
        try {
          // Fetch existing notifications
          await fetchNotifications();
          
          // Start polling for real-time updates (no WebSocket)
          wsService.connect(user.id);
          console.log('Notification system initialized for user:', user.id);
        } catch (error) {
          console.error('Failed to initialize notifications:', error);
        }
      }
    };

    initializeNotifications();

    const handleAuthChange = () => {
      const user = auth.getCurrentUser();
      if (user) {
        wsService.disconnect();
        wsService.connect(user.id);
        fetchNotifications();
      } else {
        wsService.disconnect();
      }
    };

    window.addEventListener('auth-change', handleAuthChange);
    
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      wsService.disconnect();
    };
  }, [fetchNotifications]);

  return null;
}