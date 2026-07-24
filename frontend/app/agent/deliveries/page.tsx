'use client';

import { JSX, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { api } from '@/lib/api';
import { Order, OrderStatus } from '@/types';
import {
  Package,
  MapPin,
  CheckCircle,
  Navigation,
  Clock,
  DollarSign,
  Truck,
  Search,
  Eye,
  RefreshCw,
  ChevronRight,
  Star,
  XCircle,
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

// Helper function to format currency safely
const formatCurrency = (amount: number | string | undefined): string => {
  if (amount === undefined || amount === null) return '0';
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0';
  return Math.round(numAmount).toLocaleString();
};

// Get progress percentage based on status for agent view
const getProgressPercentage = (status: OrderStatus): number => {
  const progressMap: Record<OrderStatus, number> = {
    pending: 0,
    preparing: 0,
    ready: 33,
    picked_up: 66,
    on_the_way: 66,
    delivered: 100,
    cancelled: 0,
  };
  return progressMap[status] || 0;
};

const STATUS_META: Record<string, { color: string; ring: string; text: string; icon: JSX.Element }> = {
  pending: { color: 'bg-amber-50 text-amber-700', ring: 'ring-amber-200', text: 'Pending', icon: <Clock className="w-3.5 h-3.5" /> },
  preparing: { color: 'bg-purple-50 text-purple-700', ring: 'ring-purple-200', text: 'Preparing', icon: <Package className="w-3.5 h-3.5" /> },
  ready: { color: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-200', text: 'Ready for Pickup', icon: <Package className="w-3.5 h-3.5" /> },
  picked_up: { color: 'bg-blue-50 text-blue-700', ring: 'ring-blue-200', text: 'Picked Up', icon: <Truck className="w-3.5 h-3.5" /> },
  on_the_way: { color: 'bg-indigo-50 text-indigo-700', ring: 'ring-indigo-200', text: 'On the Way', icon: <Navigation className="w-3.5 h-3.5" /> },
  delivered: { color: 'bg-gray-100 text-gray-600', ring: 'ring-gray-200', text: 'Delivered', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  cancelled: { color: 'bg-red-50 text-red-700', ring: 'ring-red-200', text: 'Cancelled', icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function AgentDeliveriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchDeliveries = useCallback(
    async (showToast = false) => {
      try {
        const response = await api.get('/orders');
        const allOrders: Order[] = ensureArray(response.data);

        const assigned = allOrders.filter((order: Order) => order.agentId === user?.id);

        setAssignedOrders(assigned);
        setLastUpdated(new Date());

        if (showToast && assigned.length > 0) {
          const activeCount = assigned.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled').length;
          if (activeCount > 0) {
            toast.success(`${activeCount} active delivery${activeCount > 1 ? 's' : ''}`);
          }
        }
      } catch (error) {
        console.error('Failed to fetch deliveries:', error);
        if (showToast) {
          toast.error('Failed to load deliveries');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.id]
  );

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser || currentUser.role !== 'agent') {
      router.push('/');
      return;
    }
    setUser(currentUser);
    fetchDeliveries();

    const interval = setInterval(() => {
      fetchDeliveries();
    }, 15000);

    const handleFocus = () => {
      fetchDeliveries();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchDeliveries, router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDeliveries(true);
  };

  const updateDeliveryStatus = async (orderId: string, status: 'picked_up' | 'delivered') => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/delivery`, { status });

      if (status === 'picked_up') {
        toast.success('Order picked up! Ready to deliver', {
          icon: '📦',
          duration: 3000,
        });
      } else if (status === 'delivered') {
        toast.success('Order delivered! Earnings added', {
          icon: '💰',
          duration: 3000,
        });
      }

      await fetchDeliveries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusInfo = (status: OrderStatus) => STATUS_META[status] || STATUS_META.pending;

  const formatDeliveryTime = (date: Date | string | undefined): string => {
    if (!date) return 'Just now';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Just now';

    const minutes = Math.floor((new Date().getTime() - dateObj.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} mins ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  };

  const filteredOrders = assignedOrders.filter((order) => {
    const matchesSearch =
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.deliveryAddress?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (order.restaurant?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: assignedOrders.length,
    ready: assignedOrders.filter((o) => o.status === 'ready').length,
    picked_up: assignedOrders.filter((o) => o.status === 'picked_up').length,
    on_the_way: assignedOrders.filter((o) => o.status === 'on_the_way').length,
    delivered: assignedOrders.filter((o) => o.status === 'delivered').length,
    totalEarnings: assignedOrders
      .filter((o) => o.status === 'delivered')
      .reduce((sum, o) => sum + (typeof o.deliveryFee === 'number' ? o.deliveryFee : 50), 0),
  };

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

  const filterTabs = [
    { id: 'all', label: 'All Orders', count: statusCounts.all },
    { id: 'ready', label: 'Ready to Pickup', count: statusCounts.ready },
    { id: 'picked_up', label: 'Picked Up', count: statusCounts.picked_up },
    { id: 'on_the_way', label: 'On the Way', count: statusCounts.on_the_way },
    { id: 'delivered', label: 'Completed', count: statusCounts.delivered },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Deliveries</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage your deliveries • Last updated: {lastUpdated.toLocaleTimeString()}
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-4">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-50 text-blue-600 mb-3">
            <Navigation className="w-4 h-4" />
          </span>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">
            {statusCounts.ready + statusCounts.picked_up + statusCounts.on_the_way}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">Active deliveries</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-4">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 mb-3">
            <CheckCircle className="w-4 h-4" />
          </span>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{statusCounts.delivered}</p>
          <p className="text-xs text-gray-500 mt-0.5">Completed</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-4">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-orange-50 text-orange-600 mb-3">
            <DollarSign className="w-4 h-4" />
          </span>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">৳{formatCurrency(statusCounts.totalEarnings)}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total earnings</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-4">
          <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-purple-50 text-purple-600 mb-3">
            <Star className="w-4 h-4" />
          </span>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">4.9</p>
          <p className="text-xs text-gray-500 mt-0.5">Rating</p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id as OrderStatus | 'all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              statusFilter === tab.id ? 'bg-orange-500 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
            <span className={`ml-2 ${statusFilter === tab.id ? 'text-white/80' : 'text-gray-400'}`}>{tab.count}</span>
          </button>
        ))}
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

      {/* Deliveries Cards */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2">
          <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">No deliveries found</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            {assignedOrders.length === 0 ? "You haven't accepted any deliveries yet." : 'No deliveries match your filters.'}
          </p>
          {assignedOrders.length === 0 && (
            <button
              onClick={() => router.push('/agent/available')}
              className="text-sm font-medium text-orange-600 hover:text-orange-700 inline-flex items-center gap-1"
            >
              Browse available orders
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            const earnings = typeof order.deliveryFee === 'number' ? order.deliveryFee : 50;
            const progressPercentage = getProgressPercentage(order.status);

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden hover:shadow-md hover:shadow-black/4 transition-shadow"
              >
                <div className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Left Section */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className="font-bold text-gray-900 text-lg">#{order.id.slice(-8).toUpperCase()}</span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${statusInfo.color} ${statusInfo.ring}`}
                        >
                          {statusInfo.icon}
                          {statusInfo.text}
                        </span>
                        <span className="text-xs text-gray-400">{formatDeliveryTime(order.updatedAt)}</span>
                      </div>

                      {/* Progress Bar */}
                      {(order.status === 'ready' || order.status === 'picked_up' || order.status === 'delivered') && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
                            <span className={order.status === 'ready' ? 'font-semibold text-orange-500' : ''}>Pick up</span>
                            <span className={order.status === 'picked_up' ? 'font-semibold text-orange-500' : ''}>Picked Up</span>
                            <span>On the Way</span>
                            <span>Deliver</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full transition-all duration-500 bg-orange-500"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Restaurant & Delivery Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="flex items-start gap-2.5 p-2.5 bg-gray-50 rounded-xl">
                          <Truck className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-400">Pick up from</p>
                            <p className="font-medium text-gray-800 text-sm truncate">{order.restaurant?.name || 'Restaurant'}</p>
                            <p className="text-xs text-gray-400 truncate">{order.restaurant?.address?.split(',')[0]}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2.5 p-2.5 bg-blue-50 rounded-xl">
                          <MapPin className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-400">Deliver to</p>
                            <p className="font-medium text-gray-800 text-sm truncate">{order.customerName || 'Customer'}</p>
                            <p className="text-xs text-gray-400 truncate">{order.deliveryAddress?.split(',')[0]}</p>
                          </div>
                        </div>
                      </div>

                      {/* Order Stats */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Package className="w-3.5 h-3.5 text-gray-300" />
                          <span className="text-gray-500">{order.items?.length || 0} items</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-orange-400" />
                          <span className="text-gray-500">Total: ৳{formatCurrency(order.totalAmount)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-emerald-600 font-medium">Earn: ৳{formatCurrency(earnings)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-row lg:flex-col gap-2 lg:min-w-44">
                      {order.status === 'ready' && (
                        <button
                          onClick={() => updateDeliveryStatus(order.id, 'picked_up')}
                          disabled={updatingId === order.id}
                          className="flex-1 lg:w-full bg-orange-500 text-white px-4 py-2.5 rounded-xl hover:bg-orange-600 transition font-medium flex items-center justify-center gap-2 text-sm shadow-sm shadow-orange-200 disabled:opacity-50"
                        >
                          <Package className="w-4 h-4" />
                          {updatingId === order.id ? 'Processing...' : 'Mark Picked Up'}
                        </button>
                      )}

                      {order.status === 'picked_up' && (
                        <button
                          onClick={() => updateDeliveryStatus(order.id, 'delivered')}
                          disabled={updatingId === order.id}
                          className="flex-1 lg:w-full bg-emerald-500 text-white px-4 py-2.5 rounded-xl hover:bg-emerald-600 transition font-medium flex items-center justify-center gap-2 text-sm shadow-sm shadow-emerald-200 disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {updatingId === order.id ? 'Processing...' : 'Mark Delivered'}
                        </button>
                      )}

                      {order.status === 'on_the_way' && (
                        <div className="flex-1 lg:w-full bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-xl text-center font-medium text-sm flex items-center justify-center gap-2">
                          <Navigation className="w-4 h-4 animate-pulse" />
                          On the Way
                        </div>
                      )}

                      {order.status === 'delivered' && (
                        <div className="flex-1 lg:w-full bg-gray-100 text-gray-500 px-4 py-2.5 rounded-xl text-center font-medium text-sm">
                          ✓ Completed
                        </div>
                      )}

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
            );
          })}
        </div>
      )}
    </div>
  );
}