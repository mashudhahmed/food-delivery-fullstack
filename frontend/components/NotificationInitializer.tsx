'use client';

import { useEffect } from 'react';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { auth } from '@/lib/api';
import { wsService } from '@/lib/websocket';

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
          
          // Try to connect WebSocket, but don't let it crash the app
          try {
            wsService.connect(user.id);
          } catch (wsError) {
            console.log('WebSocket not available - using polling only');
          }
          console.log('Notification system initialized for user:', user.id);
        } catch (error) {
          console.log('Notification system initialization skipped:', error);
        }
      }
    };

    initializeNotifications();

    const handleAuthChange = () => {
      const user = auth.getCurrentUser();
      if (user) {
        try {
          wsService.disconnect();
          wsService.connect(user.id);
        } catch (error) {
          console.log('WebSocket connection skipped');
        }
        fetchNotifications();
      } else {
        wsService.disconnect();
      }
    };

    window.addEventListener('auth-change', handleAuthChange);
    
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      try {
        wsService.disconnect();
      } catch (error) {
        // Ignore disconnect errors
      }
    };
  }, [fetchNotifications]);

  return null;
}