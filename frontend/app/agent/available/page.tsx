'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { api } from '@/lib/api';
import { Order } from '@/types';
import {
  Package,
  MapPin,
  Navigation,
  Clock,
  Truck,
  Search,
  RefreshCw,
  ChevronRight,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ✅ Helper to ensure array, in case the API wraps the list in an object
const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.orders && Array.isArray(data.orders)) return data.orders;
  console.warn('⚠️ Unexpected data format for orders:', typeof data, data);
  return [];
};

export default function AgentAvailablePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAvailableOrders = useCallback(async (showToast = false) => {
    try {
      const response = await api.get('/orders');
      const allOrders: Order[] = ensureArray(response.data);

      const available = allOrders.filter((order: Order) => order.status === 'ready' && !order.agentId);

      setAvailableOrders(available);
      setLastUpdated(new Date());

      if (showToast && available.length > 0) {
        toast.success(`${available.length} new order${available.length > 1 ? 's' : ''} available`);
      }
    } catch (error) {
      console.error('Failed to fetch available orders:', error);
      if (showToast) {
        toast.error('Failed to load orders');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser || currentUser.role !== 'agent') {
      router.push('/');
      return;
    }
    setUser(currentUser);
    fetchAvailableOrders();

    // Auto-refresh every 15 seconds (industry standard)
    const interval = setInterval(() => {
      fetchAvailableOrders();
    }, 15000);

    // Refresh when tab gets focus
    const handleFocus = () => {
      fetchAvailableOrders();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchAvailableOrders, router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAvailableOrders(true);
  };

  const acceptOrder = async (orderId: string) => {
    setAcceptingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/assign`, { agentId: user?.id });
      toast.success('Order accepted! Head to restaurant', {
        icon: '✅',
        duration: 3000,
      });
      await fetchAvailableOrders();
      router.push('/agent/deliveries');
    } catch (error: any) {
      console.error('Accept failed:', error);
      toast.error(error.response?.data?.message || 'Failed to accept order');
    } finally {
      setAcceptingId(null);
    }
  };

  const formatDistance = (): string => {
    // Simulate distance - in production, calculate from backend
    const distances = ['0.8 km', '1.2 km', '1.5 km', '2.0 km', '2.3 km'];
    return distances[Math.floor(Math.random() * distances.length)];
  };

  const formatReadyTime = (date: Date | string | undefined): string => {
    if (!date) return 'Just now';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Just now';

    const minutes = Math.floor((new Date().getTime() - dateObj.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    return `${minutes} mins ago`;
  };

  const filteredOrders = availableOrders.filter((order) => {
    const term = searchTerm.toLowerCase();
    return (
      order.id.toLowerCase().includes(term) ||
      (order.restaurant?.name?.toLowerCase() || '').includes(term) ||
      (order.deliveryAddress?.toLowerCase() || '').includes(term)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl border border-gray-100" />
          ))}
        </div>
        <div className="h-64 bg-gray-100 rounded-2xl border border-gray-100" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Available Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Orders ready for pickup • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 px-3.5 py-2 rounded-xl hover:bg-gray-50 hover:text-gray-900 transition disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="relative bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/[0.02] p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-orange-50 text-orange-600">
              <Package className="w-4 h-4" />
            </span>
            {availableOrders.length > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
              </span>
            )}
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{availableOrders.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Available orders</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/[0.02] p-4">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 text-blue-600 mb-3">
            <Truck className="w-4 h-4" />
          </span>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">৳50</p>
          <p className="text-xs text-gray-500 mt-0.5">Avg delivery fee</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/[0.02] p-4">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 mb-3">
            <Navigation className="w-4 h-4" />
          </span>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">৳{availableOrders.length * 50}</p>
          <p className="text-xs text-gray-500 mt-0.5">Potential earnings</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/[0.02] p-4">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-purple-50 text-purple-600 mb-3">
            <Clock className="w-4 h-4" />
          </span>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">12</p>
          <p className="text-xs text-gray-500 mt-0.5">Active agents</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by order ID, restaurant, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
        />
      </div>

      {/* Orders Cards */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/[0.02]">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">No available orders</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Check back later for new delivery opportunities.</p>
          <button
            onClick={handleRefresh}
            className="text-sm font-medium text-orange-600 hover:text-orange-700 inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/[0.02] overflow-hidden hover:shadow-md hover:shadow-black/[0.04] transition-shadow"
            >
              <div className="p-5">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left Section */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="font-bold text-gray-900 text-lg">#{order.id.slice(-8).toUpperCase()}</span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-200">
                        <Clock className="w-3 h-3" />
                        Ready for Pickup
                      </span>
                      <span className="text-xs text-gray-400">{formatReadyTime(order.updatedAt)}</span>
                    </div>

                    {/* Restaurant Card */}
                    <div className="flex items-start gap-3 mb-3 p-3 bg-gray-50 rounded-xl">
                      <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-100 text-orange-600 shrink-0">
                        <Truck className="w-5 h-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">Pick up from</p>
                        <p className="font-semibold text-gray-900 text-sm truncate">{order.restaurant?.name || 'Restaurant'}</p>
                        <p className="text-xs text-gray-400 truncate">{order.restaurant?.address?.split(',')[0] || 'Address not available'}</p>
                      </div>
                    </div>

                    {/* Delivery Address */}
                    <div className="flex items-start gap-3 mb-4 p-3 bg-blue-50 rounded-xl">
                      <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-600 shrink-0">
                        <MapPin className="w-5 h-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-500">Deliver to</p>
                        <p className="font-semibold text-gray-900 text-sm truncate">{order.deliveryAddress.split(',')[0]}</p>
                        <p className="text-xs text-gray-400 truncate">{order.deliveryAddress}</p>
                      </div>
                    </div>

                    {/* Order Stats */}
                    <div className="flex flex-wrap gap-5 text-sm">
                      <div>
                        <span className="text-gray-400">Items:</span>
                        <span className="font-medium text-gray-800 ml-1">{order.items?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Total:</span>
                        <span className="font-medium text-orange-600 ml-1 tabular-nums">৳{order.totalAmount}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Distance:</span>
                        <span className="font-medium text-gray-800 ml-1">{formatDistance()}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Your earnings:</span>
                        <span className="font-medium text-emerald-600 ml-1 tabular-nums">৳{order.deliveryFee || 50}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Section - Action Button */}
                  <div className="flex flex-row lg:flex-col gap-2 lg:min-w-44">
                    <button
                      onClick={() => acceptOrder(order.id)}
                      disabled={acceptingId === order.id}
                      className="flex-1 lg:w-full bg-orange-500 text-white px-5 py-2.5 rounded-xl hover:bg-orange-600 transition font-medium flex items-center justify-center gap-2 text-sm shadow-sm shadow-orange-200 disabled:opacity-50"
                    >
                      <Navigation className="w-4 h-4" />
                      {acceptingId === order.id ? 'Accepting...' : 'Accept'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => router.push(`/orders/${order.id}`)}
                      className="flex-1 lg:w-full border border-gray-200 text-gray-600 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition text-sm flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}