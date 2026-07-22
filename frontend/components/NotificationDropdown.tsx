// components/NotificationDropdown.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, X, Package, CheckCircle, Truck, Store, DollarSign } from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';
import { Notification, NotificationType } from '@/types/notification';
import { formatDistanceToNow } from 'date-fns';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'order_new':
      return <Package className="w-4 h-4 text-blue-500" aria-hidden="true" />;
    case 'order_ready':
      return <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />;
    case 'order_delivered':
      return <Truck className="w-4 h-4 text-purple-500" aria-hidden="true" />;
    case 'order_cancelled':
      return <X className="w-4 h-4 text-red-500" aria-hidden="true" />;
    case 'restaurant_approved':
      return <Store className="w-4 h-4 text-green-500" aria-hidden="true" />;
    case 'restaurant_rejected':
      return <Store className="w-4 h-4 text-red-500" aria-hidden="true" />;
    case 'agent_assigned':
      return <Truck className="w-4 h-4 text-orange-500" aria-hidden="true" />;
    case 'payment_received':
      return <DollarSign className="w-4 h-4 text-green-500" aria-hidden="true" />;
    default:
      return <Bell className="w-4 h-4 text-gray-500" aria-hidden="true" />;
  }
};

export default function NotificationDropdown() {
  const router = useRouter();
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.data?.orderId) {
      router.push(`/orders/${notification.data.orderId}`);
    } else if (notification.data?.restaurantId) {
      router.push(`/restaurants/${notification.data.restaurantId}`);
    }
    
    setIsOpen(false);
  };

  const handleMarkAllRead = async () => {
    setIsLoading(true);
    await markAllAsRead();
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close notifications' : 'Open notifications'}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="p-2 hover:bg-gray-100 rounded-full relative transition focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <Bell className="w-5 h-5 text-gray-500" aria-hidden="true" />
        {unreadCount > 0 && (
          <span 
            className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop for closing */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
            aria-hidden="true"
          />
          <div 
            className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border z-50 max-h-[80vh] flex flex-col"
            role="dialog"
            aria-label="Notifications"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b flex justify-between items-center shrink-0">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isLoading}
                  className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded px-2 py-1"
                  aria-label="Mark all notifications as read"
                >
                  <CheckCheck className="w-3 h-3" aria-hidden="true" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" aria-hidden="true" />
                  <p className="text-sm text-gray-500">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleNotificationClick(notification);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${notification.title}: ${notification.message}`}
                    className={`px-4 py-3 border-b hover:bg-gray-50 cursor-pointer transition ${!notification.read ? 'bg-orange-50/30' : ''}`}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0" aria-hidden="true">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="shrink-0" aria-hidden="true">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t bg-gray-50 rounded-b-lg shrink-0">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/notifications');
                }}
                className="text-xs text-orange-500 hover:text-orange-600 w-full text-center focus:outline-none focus:ring-2 focus:ring-orange-500 rounded py-1"
                aria-label="View all notifications"
              >
                View all notifications
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}