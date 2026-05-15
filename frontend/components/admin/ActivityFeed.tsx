'use client';

import { useState, useEffect } from 'react';
import { ShoppingBag, UserPlus, Truck, Store, Package, RefreshCw } from 'lucide-react';
import { api } from '@/app/lib/api';
import toast from 'react-hot-toast';

interface Activity {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  icon: string;
}

const iconMap: Record<string, any> = {
  'shopping-bag': ShoppingBag,
  'user-plus': UserPlus,
  'truck': Truck,
  'store': Store,
  'package': Package,
};

export function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);

  const fetchActivities = async () => {
    try {
      const response = await api.get(`/admin/activity?limit=${limit}`);
      setActivities(response.data);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      toast.error('Failed to load activity feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">Activity Feed</h3>
        <button
          onClick={fetchActivities}
          className="p-1.5 text-gray-400 hover:text-gray-600 transition"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {activities.map((activity) => {
          const Icon = iconMap[activity.icon] || ShoppingBag;
          return (
            <div key={activity.id} className="p-4 hover:bg-gray-50 transition flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-800">{activity.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
        {activities.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            No recent activity
          </div>
        )}
      </div>
      <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
        <select
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="text-sm border rounded-lg px-2 py-1"
        >
          <option value={5}>Show 5</option>
          <option value={10}>Show 10</option>
          <option value={20}>Show 20</option>
          <option value={50}>Show 50</option>
        </select>
      </div>
    </div>
  );
}