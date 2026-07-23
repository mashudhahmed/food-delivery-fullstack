// frontend/app/notifications/page.tsx

'use client';

import { useEffect, useState, JSX } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, X, Package, CheckCircle, Truck, Store, DollarSign } from 'lucide-react';
import { useNotificationStore } from '@/stores/notificationStore';
import { Notification, NotificationType } from '@/types/notification';
import { formatDistanceToNow } from 'date-fns';

const NOTIFICATION_META: Record<NotificationType | 'default', { icon: JSX.Element; tint: string }> = {
  order_new: { icon: <Package className="w-4.5 h-4.5" />, tint: 'bg-blue-50 text-blue-600' },
  order_ready: { icon: <CheckCircle className="w-4.5 h-4.5" />, tint: 'bg-emerald-50 text-emerald-600' },
  order_delivered: { icon: <Truck className="w-4.5 h-4.5" />, tint: 'bg-purple-50 text-purple-600' },
  order_cancelled: { icon: <X className="w-4.5 h-4.5" />, tint: 'bg-red-50 text-red-600' },
  restaurant_approved: { icon: <Store className="w-4.5 h-4.5" />, tint: 'bg-emerald-50 text-emerald-600' },
  restaurant_rejected: { icon: <Store className="w-4.5 h-4.5" />, tint: 'bg-red-50 text-red-600' },
  agent_assigned: { icon: <Truck className="w-4.5 h-4.5" />, tint: 'bg-orange-50 text-orange-600' },
  payment_received: { icon: <DollarSign className="w-4.5 h-4.5" />, tint: 'bg-emerald-50 text-emerald-600' },
  default: { icon: <Bell className="w-4.5 h-4.5" />, tint: 'bg-gray-100 text-gray-500' },
} as any;

const getNotificationMeta = (type: NotificationType) => NOTIFICATION_META[type] || NOTIFICATION_META.default;

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    await fetchNotifications();
    setLoading(false);
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.data?.orderId) {
      router.push(`/orders/${notification.data.orderId}`);
    } else if (notification.data?.restaurantId) {
      router.push(`/restaurants/${notification.data.restaurantId}`);
    }
  };

  const filteredNotifications = filter === 'all' ? notifications : notifications.filter((n) => !n.read);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-3xl mx-auto px-4 space-y-4 animate-pulse">
          <div className="h-8 w-48 bg-gray-200 rounded-lg" />
          <div className="h-10 w-64 bg-gray-100 rounded-xl" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 shrink-0">
              <Bell className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
              <p className="text-sm text-gray-500 mt-0.5">Stay updated with your activity</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition text-sm font-medium text-gray-600 shrink-0"
            >
              <CheckCheck className="w-4 h-4 text-orange-500" />
              <span className="hidden sm:inline">Mark all read</span>
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            All
            <span className={`text-xs ${filter === 'all' ? 'text-gray-400' : 'text-gray-400'}`}>{notifications.length}</span>
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              filter === 'unread' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] font-semibold ${
                  filter === 'unread' ? 'bg-orange-100 text-orange-600' : 'bg-orange-50 text-orange-500'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Notifications List */}
        <div className="space-y-2.5">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/[0.02] p-14 text-center">
              <Bell className="w-12 h-12 text-gray-200 mx-auto mb-4" />
              <p className="text-sm font-medium text-gray-600">No notifications</p>
              <p className="text-xs text-gray-400 mt-1">You're all caught up.</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const meta = getNotificationMeta(notification.type);
              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`relative bg-white rounded-2xl border shadow-sm shadow-black/[0.02] p-4 hover:shadow-md hover:shadow-black/[0.04] transition-shadow cursor-pointer ${
                    !notification.read ? 'border-orange-100' : 'border-gray-100'
                  }`}
                >
                  {!notification.read && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 rounded-r-full bg-orange-500" />
                  )}
                  <div className="flex gap-3.5">
                    <span className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${meta.tint}`}>
                      {meta.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-gray-900 truncate">{notification.title}</p>
                          <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{notification.message}</p>
                          <p className="text-xs text-gray-400 mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.read && <span className="w-2 h-2 rounded-full bg-orange-500 mt-1.5 shrink-0" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}