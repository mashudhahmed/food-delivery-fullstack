// components/NotificationDropdown.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCheck,
  X,
  Package,
  CheckCircle,
  Truck,
  Store,
  DollarSign,
} from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';
import { Notification, NotificationType } from '@/types/notification';
import { formatDistanceToNow } from 'date-fns';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'order_new':
      return <Package className="w-4 h-4 text-blue-500" />;
    case 'order_ready':
      return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    case 'order_delivered':
      return <Truck className="w-4 h-4 text-purple-500" />;
    case 'order_cancelled':
      return <X className="w-4 h-4 text-red-500" />;
    case 'restaurant_approved':
      return <Store className="w-4 h-4 text-emerald-500" />;
    case 'restaurant_rejected':
      return <Store className="w-4 h-4 text-red-500" />;
    case 'agent_assigned':
      return <Truck className="w-4 h-4 text-orange-500" />;
    case 'payment_received':
      return <DollarSign className="w-4 h-4 text-emerald-500" />;
    default:
      return <Bell className="w-4 h-4 text-slate-400" />;
  }
};

export default function NotificationDropdown() {
  const router = useRouter();
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } =
    useNotificationStore();
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
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close notifications' : 'Open notifications'}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="relative p-2.5 rounded-xl hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-orange-500/40"
      >
        <Bell className="w-5 h-5 text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Panel */}
          <div
            className="absolute right-0 mt-2 w-95 bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-100 z-50 max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            role="dialog"
            aria-label="Notifications"
          >
            {/* Header */}
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[11px] font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  disabled={isLoading}
                  className="text-xs font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-orange-50 transition disabled:opacity-50"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                    <Bell className="w-6 h-6 text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">No notifications yet</p>
                  <p className="text-xs text-slate-400 mt-1 text-center">
                    Order updates and alerts will show up here
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3.5 border-b border-slate-50 hover:bg-slate-50 transition flex gap-3 ${
                      !notification.read ? 'bg-orange-50/40' : ''
                    }`}
                  >
                    <div className="shrink-0 w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900 leading-snug">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <span className="mt-1.5 w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/80 shrink-0">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/notifications');
                }}
                className="w-full text-center text-xs font-semibold text-orange-600 hover:text-orange-700 py-1.5 rounded-lg hover:bg-orange-50 transition"
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