// app/owner/orders/page.tsx
'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import {
  Package,
  Search,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  Navigation,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  placedAt: string;
  deliveryAddress: string;
  customerName?: string;
  restaurant?: { id: string; name: string };
  items?: any[];
}

// ✅ Helper to ensure array
const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.orders && Array.isArray(data.orders)) return data.orders;
  if (data?.results && Array.isArray(data.results)) return data.results;
  console.warn('⚠️ Unexpected data format:', typeof data, data);
  return [];
};

const STATUS_META: Record<string, { color: string; ring: string; icon: React.ReactNode; text: string; dot: string }> = {
  pending: { color: 'bg-amber-50 text-amber-700', ring: 'ring-amber-200', icon: <Clock className="w-3 h-3" />, text: 'Pending', dot: 'bg-amber-500' },
  preparing: { color: 'bg-blue-50 text-blue-700', ring: 'ring-blue-200', icon: <Package className="w-3 h-3" />, text: 'Preparing', dot: 'bg-blue-500' },
  ready: { color: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-200', icon: <CheckCircle className="w-3 h-3" />, text: 'Ready', dot: 'bg-emerald-500' },
  picked_up: { color: 'bg-purple-50 text-purple-700', ring: 'ring-purple-200', icon: <Truck className="w-3 h-3" />, text: 'Picked Up', dot: 'bg-purple-500' },
  on_the_way: { color: 'bg-indigo-50 text-indigo-700', ring: 'ring-indigo-200', icon: <Navigation className="w-3 h-3" />, text: 'On the Way', dot: 'bg-indigo-500' },
  delivered: { color: 'bg-gray-100 text-gray-600', ring: 'ring-gray-200', icon: <CheckCircle className="w-3 h-3" />, text: 'Delivered', dot: 'bg-gray-400' },
  cancelled: { color: 'bg-red-50 text-red-700', ring: 'ring-red-200', icon: <XCircle className="w-3 h-3" />, text: 'Cancelled', dot: 'bg-red-500' },
};

// Separate component that uses useSearchParams
function OwnerOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantIdParam = searchParams.get('restaurant');

  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser || currentUser.role !== 'owner') {
      router.push('/');
      return;
    }
    setUser(currentUser);
    fetchData();
  }, []);

  useEffect(() => {
    if (restaurantIdParam && restaurants.length > 0) {
      setSelectedRestaurant(restaurantIdParam);
    }
  }, [restaurantIdParam, restaurants]);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchOrders();
    }
  }, [selectedRestaurant]);

  const fetchData = async () => {
    try {
      const currentUser = auth.getCurrentUser();
      const restaurantsRes = await api.get(`/restaurants?ownerId=${currentUser?.id}`);

      // ✅ Ensure restaurants is an array
      const ownerRestaurants = ensureArray(restaurantsRes.data);
      setRestaurants(ownerRestaurants);

      if (ownerRestaurants.length > 0 && !selectedRestaurant) {
        setSelectedRestaurant(ownerRestaurants[0].id);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      let allOrders: Order[] = [];
      try {
        const ordersRes = await api.get('/orders/my-restaurant');
        // ✅ Ensure orders is an array
        allOrders = ensureArray(ordersRes.data);
      } catch (err) {
        const allOrdersRes = await api.get('/orders');
        const allOrdersData = ensureArray(allOrdersRes.data);
        const restaurantIds = restaurants.map((r) => r.id);
        allOrders = allOrdersData.filter((order: Order) =>
          restaurantIds.includes(order.restaurant?.id || '')
        );
      }

      // Filter by selected restaurant
      if (selectedRestaurant) {
        allOrders = allOrders.filter((order) => order.restaurant?.id === selectedRestaurant);
      }

      setOrders(allOrders);
    } catch (error) {
      console.error('Failed to load orders:', error);
      toast.error('Failed to load orders');
      setOrders([]);
    } finally {
      setRefreshing(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success(`Order status updated to ${status}`);
      fetchOrders(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => STATUS_META[status] || STATUS_META.pending;

  // ✅ Safe filter - ensure orders is an array
  const safeOrders = Array.isArray(orders) ? orders : [];

  const filteredOrders = safeOrders.filter((order) => {
    const matchesSearch =
      order.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    pending: safeOrders.filter((o) => o.status === 'pending').length,
    preparing: safeOrders.filter((o) => o.status === 'preparing').length,
    ready: safeOrders.filter((o) => o.status === 'ready').length,
    picked_up: safeOrders.filter((o) => o.status === 'picked_up').length,
    on_the_way: safeOrders.filter((o) => o.status === 'on_the_way').length,
    delivered: safeOrders.filter((o) => o.status === 'delivered').length,
    cancelled: safeOrders.filter((o) => o.status === 'cancelled').length,
  };

  const filterTabs = [
    { id: 'all', label: 'All', count: safeOrders.length },
    { id: 'pending', label: 'Pending', count: statusCounts.pending },
    { id: 'preparing', label: 'Preparing', count: statusCounts.preparing },
    { id: 'ready', label: 'Ready', count: statusCounts.ready },
    { id: 'picked_up', label: 'Picked Up', count: statusCounts.picked_up },
    { id: 'on_the_way', label: 'On the Way', count: statusCounts.on_the_way },
    { id: 'delivered', label: 'Delivered', count: statusCounts.delivered },
    { id: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled },
  ];

  const heroStats = [
    { id: 'pending', label: 'Needs attention', count: statusCounts.pending, meta: STATUS_META.pending, live: true },
    { id: 'preparing', label: 'In the kitchen', count: statusCounts.preparing, meta: STATUS_META.preparing },
    { id: 'on_the_way', label: 'Out for delivery', count: statusCounts.on_the_way, meta: STATUS_META.on_the_way },
    { id: 'delivered', label: 'Completed today', count: statusCounts.delivered, meta: STATUS_META.delivered },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl border border-gray-100" />
          ))}
        </div>
        <div className="h-96 bg-gray-100 rounded-2xl border border-gray-100" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage customer orders in real time</p>
        </div>
        <button
          onClick={() => fetchOrders()}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 px-3.5 py-2 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Hero stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {heroStats.map((stat) => (
          <div
            key={stat.id}
            className="relative bg-white rounded-2xl border border-gray-100 p-4 shadow-sm shadow-black/[0.02]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className={`flex items-center justify-center w-9 h-9 rounded-xl ${stat.meta.color}`}>
                {stat.meta.icon}
              </span>
              {stat.live && stat.count > 0 && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{stat.count}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Restaurant Selector */}
      {restaurants.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
          {restaurants.map((restaurant) => (
            <button
              key={restaurant.id}
              onClick={() => setSelectedRestaurant(restaurant.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap border ${
                selectedRestaurant === restaurant.id
                  ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {restaurant.name}
            </button>
          ))}
        </div>
      )}

      {/* Search + status filter row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order ID or customer name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
          />
        </div>
        <div className="relative sm:w-56">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full appearance-none pl-4 pr-9 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition cursor-pointer"
          >
            {filterTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label} ({tab.count})
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Quick status pills (secondary, scrollable) */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterTabs.map((tab) => {
          const meta = tab.id === 'all' ? null : STATUS_META[tab.id];
          const active = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                active
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {meta && <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />}
              {tab.label}
              <span className={active ? 'text-white/80' : 'text-gray-400'}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Order</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Placed</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-600">
                      {safeOrders.length === 0 ? 'No orders yet' : 'No orders match your filters'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {safeOrders.length === 0
                        ? 'New orders for this restaurant will show up here.'
                        : 'Try clearing the search or switching status.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusInfo = getStatusBadge(order.status);
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                        #{order.id?.slice(-8).toUpperCase() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{order.customerName || 'Customer'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 tabular-nums">
                        ৳{order.totalAmount || 0}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${statusInfo.color} ${statusInfo.ring}`}
                        >
                          {statusInfo.icon}
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {order.placedAt ? new Date(order.placedAt).toLocaleString() : 'Just now'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-end">
                          {order.status === 'pending' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'preparing')}
                              disabled={updatingId === order.id}
                              className="text-xs font-medium bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition"
                            >
                              {updatingId === order.id ? '...' : 'Accept'}
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'ready')}
                              disabled={updatingId === order.id}
                              className="text-xs font-medium bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition"
                            >
                              {updatingId === order.id ? '...' : 'Mark Ready'}
                            </button>
                          )}
                          <button
                            onClick={() => router.push(`/orders/${order.id}`)}
                            className="text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:text-gray-800 flex items-center gap-1.5 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Main export with Suspense boundary
export default function OwnerOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      }
    >
      <OwnerOrdersContent />
    </Suspense>
  );
}