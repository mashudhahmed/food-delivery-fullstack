// frontend/components/NotificationDropdown.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, X, Clock, Package, CheckCircle, Truck, Store, DollarSign } from 'lucide-react';
import { useNotificationStore } from '@/app/stores/notificationStore';
import { Notification, NotificationType } from '@/app/types/notification';
import { formatDistanceToNow } from 'date-fns';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'order_new':
      return <Package className="w-4 h-4 text-blue-500" />;
    case 'order_ready':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'order_delivered':
      return <Truck className="w-4 h-4 text-purple-500" />;
    case 'order_cancelled':
      return <X className="w-4 h-4 text-red-500" />;
    case 'restaurant_approved':
      return <Store className="w-4 h-4 text-green-500" />;
    case 'restaurant_rejected':
      return <Store className="w-4 h-4 text-red-500" />;
    case 'agent_assigned':
      return <Truck className="w-4 h-4 text-orange-500" />;
    case 'payment_received':
      return <DollarSign className="w-4 h-4 text-green-500" />;
    default:
      return <Bell className="w-4 h-4 text-gray-500" />;
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

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-gray-100 rounded-full relative transition"
      >
        <Bell className="w-5 h-5 text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border z-50">
            {/* Header */}
            <div className="px-4 py-3 border-b flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isLoading}
                  className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 border-b hover:bg-gray-50 cursor-pointer transition ${
                      !notification.read ? 'bg-orange-50/30' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="shrink-0">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          {getNotificationIcon(notification.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="shrink-0">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t bg-gray-50 rounded-b-lg">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/notifications');
                }}
                className="text-xs text-orange-500 hover:text-orange-600 w-full text-center"
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