// app/owner/dashboard/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import {
  DollarSign,
  ShoppingBag,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Star,
  Package,
  Eye,
  Store,
  Phone,
  MapPin,
  Clock,
  X,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Bike,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { wsService } from '@/lib/websocket';
import { playKitchenAlertSound } from '@/lib/sound';

interface OwnerStats {
  totalRestaurants: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
  pickedUpOrders: number;
  onTheWayOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  avgRating: number;
  revenueGrowth: number;
  orderGrowth: number;
  completionRate: number;
}

// Helper function to safely format numbers
const formatSafeNumber = (value: any): string => {
  if (value === undefined || value === null) return '0';

  let numValue: number;

  if (typeof value === 'number') {
    numValue = value;
  } else if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    numValue = parseFloat(cleaned);
  } else {
    numValue = 0;
  }

  if (isNaN(numValue)) return '0';

  return Math.round(numValue).toLocaleString();
};

// Helper function to safely parse amount to number
const parseAmount = (amount: any): number => {
  if (amount === undefined || amount === null) return 0;
  if (typeof amount === 'number') return amount;
  if (typeof amount === 'string') {
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

// ✅ Helper function to ensure array
const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.orders && Array.isArray(data.orders)) return data.orders;
  console.warn('⚠️ Data is not an array:', data);
  return [];
};

const STATUS_META: Record<string, { color: string; ring: string; text: string; dot: string }> = {
  pending: { color: 'bg-amber-50 text-amber-700', ring: 'ring-amber-200', text: 'Pending', dot: 'bg-amber-500' },
  preparing: { color: 'bg-blue-50 text-blue-700', ring: 'ring-blue-200', text: 'Preparing', dot: 'bg-blue-500' },
  ready: { color: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-200', text: 'Ready', dot: 'bg-emerald-500' },
  picked_up: { color: 'bg-purple-50 text-purple-700', ring: 'ring-purple-200', text: 'Picked Up', dot: 'bg-purple-500' },
  on_the_way: { color: 'bg-indigo-50 text-indigo-700', ring: 'ring-indigo-200', text: 'On the Way', dot: 'bg-indigo-500' },
  delivered: { color: 'bg-gray-100 text-gray-600', ring: 'ring-gray-200', text: 'Delivered', dot: 'bg-gray-400' },
  cancelled: { color: 'bg-red-50 text-red-700', ring: 'ring-red-200', text: 'Cancelled', dot: 'bg-red-500' },
};

const StatCard = ({ title, value, icon: Icon, trend, tint }: any) => {
  const getDisplayValue = () => {
    if (title === 'Total Revenue') {
      if (typeof value === 'string' && value.startsWith('৳')) {
        return value;
      }
      return `৳${formatSafeNumber(value)}`;
    }
    if (title === 'Completion Rate' && typeof value === 'string' && value.includes('%')) {
      return value;
    }
    if (title === 'Avg Rating') {
      if (typeof value === 'number') return value.toFixed(1);
      return value;
    }
    return formatSafeNumber(value);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-5 hover:shadow-md hover:shadow-black/4 transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <span className={`flex items-center justify-center w-10 h-10 rounded-xl ${tint}`}>
          <Icon className="w-5 h-5" />
        </span>
        {trend !== undefined && trend !== null && !isNaN(trend) && (
          <span
            className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
              trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
            }`}
          >
            {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(Math.round(trend * 10) / 10)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 tabular-nums">{getDisplayValue()}</p>
      <p className="text-sm text-gray-400 mt-1">{title}</p>
      {trend !== undefined && trend !== null && !isNaN(trend) && (
        <p className="text-[11px] text-gray-300 mt-0.5">vs. last month</p>
      )}
    </div>
  );
};

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingStore, setTogglingStore] = useState(false);
  const [selectedDrawerOrder, setSelectedDrawerOrder] = useState<any | null>(null);
  const [loadingDrawerDetails, setLoadingDrawerDetails] = useState(false);
  const [updatingDrawerStatus, setUpdatingDrawerStatus] = useState(false);

  const [stats, setStats] = useState<OwnerStats>({
    totalRestaurants: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    pickedUpOrders: 0,
    onTheWayOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    avgRating: 4.5,
    revenueGrowth: 0,
    orderGrowth: 0,
    completionRate: 0,
  });

  const [revenueData, setRevenueData] = useState([
    { name: 'Jan', revenue: 0, orders: 0 },
    { name: 'Feb', revenue: 0, orders: 0 },
    { name: 'Mar', revenue: 0, orders: 0 },
    { name: 'Apr', revenue: 0, orders: 0 },
    { name: 'May', revenue: 0, orders: 0 },
    { name: 'Jun', revenue: 0, orders: 0 },
  ]);

  const [statusData, setStatusData] = useState([
    { month: 'Jan', pending: 0, preparing: 0, delivered: 0 },
    { month: 'Feb', pending: 0, preparing: 0, delivered: 0 },
    { month: 'Mar', pending: 0, preparing: 0, delivered: 0 },
    { month: 'Apr', pending: 0, preparing: 0, delivered: 0 },
    { month: 'May', pending: 0, preparing: 0, delivered: 0 },
    { month: 'Jun', pending: 0, preparing: 0, delivered: 0 },
  ]);

  const fetchOwnerData = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const currentUser = auth.getCurrentUser();
      if (!currentUser) return;

      // Fetch restaurants owned by this owner
      const restaurantsRes = await api.get(`/restaurants?ownerId=${currentUser.id}`);
      const ownerRestaurants = ensureArray(restaurantsRes.data);
      setRestaurants(ownerRestaurants);

      // Fetch orders for owner's restaurants
      let allOrders: any[] = [];
      try {
        const ordersRes = await api.get('/orders/my-restaurant');
        allOrders = ensureArray(ordersRes.data);
      } catch (err) {
        if (ownerRestaurants.length > 0) {
          const allOrdersRes = await api.get('/orders');
          const allOrdersData = ensureArray(allOrdersRes.data);
          const restaurantIds = ownerRestaurants.map((r: any) => r.id);
          allOrders = allOrdersData.filter((order: any) => restaurantIds.includes(order.restaurantId));
        }
      }

      // ✅ Ensure allOrders is an array
      const safeOrders = ensureArray(allOrders);
      setOrders(safeOrders);

      // Calculate real stats
      const completedOrders = safeOrders.filter((o: any) => o.status === 'delivered');

      const totalRevenue = completedOrders.reduce((sum: number, o: any) => {
        return sum + parseAmount(o.totalAmount);
      }, 0);

      const totalOrders = safeOrders.length;

      // Calculate growth rates
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYearOrders = safeOrders.filter((o) => {
        const date = new Date(o.placedAt);
        return date.getMonth() === currentMonth;
      });
      const previousMonthOrders = safeOrders.filter((o) => {
        const date = new Date(o.placedAt);
        return date.getMonth() === currentMonth - 1;
      });

      const orderGrowth = previousMonthOrders.length
        ? ((currentYearOrders.length - previousMonthOrders.length) / previousMonthOrders.length) * 100
        : 0;

      const currentMonthRevenue = completedOrders
        .filter((o) => {
          const date = new Date(o.placedAt);
          return date.getMonth() === currentMonth;
        })
        .reduce((sum, o) => sum + parseAmount(o.totalAmount), 0);

      const previousMonthRevenue = completedOrders
        .filter((o) => {
          const date = new Date(o.placedAt);
          return date.getMonth() === currentMonth - 1;
        })
        .reduce((sum, o) => sum + parseAmount(o.totalAmount), 0);

      const revenueGrowth = previousMonthRevenue
        ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
        : 0;

      // Calculate monthly data
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleString('default', { month: 'short' });
        const monthOrders = safeOrders.filter((o) => {
          const orderDate = new Date(o.placedAt);
          return orderDate.getMonth() === date.getMonth() && orderDate.getFullYear() === date.getFullYear();
        });
        const monthRevenue = monthOrders
          .filter((o) => o.status === 'delivered')
          .reduce((sum, o) => sum + parseAmount(o.totalAmount), 0);

        monthlyData.push({
          name: monthName,
          revenue: monthRevenue,
          orders: monthOrders.length,
        });
      }
      setRevenueData(monthlyData);

      // Calculate status distribution
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleString('default', { month: 'short' });
        const monthOrders = safeOrders.filter((o) => {
          const orderDate = new Date(o.placedAt);
          return orderDate.getMonth() === date.getMonth() && orderDate.getFullYear() === date.getFullYear();
        });

        last6Months.push({
          month: monthName,
          pending: monthOrders.filter((o) => o.status === 'pending').length,
          preparing: monthOrders.filter((o) => o.status === 'preparing').length,
          delivered: monthOrders.filter((o) => o.status === 'delivered').length,
        });
      }
      setStatusData(last6Months);

      setStats({
        totalRestaurants: ownerRestaurants.length,
        totalOrders: safeOrders.length,
        totalRevenue,
        pendingOrders: safeOrders.filter((o: any) => o.status === 'pending').length,
        preparingOrders: safeOrders.filter((o: any) => o.status === 'preparing').length,
        readyOrders: safeOrders.filter((o: any) => o.status === 'ready').length,
        pickedUpOrders: safeOrders.filter((o: any) => o.status === 'picked_up').length,
        onTheWayOrders: safeOrders.filter((o: any) => o.status === 'on_the_way').length,
        completedOrders: completedOrders.length,
        cancelledOrders: safeOrders.filter((o: any) => o.status === 'cancelled').length,
        avgRating: 4.5,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        orderGrowth: Math.round(orderGrowth * 10) / 10,
        completionRate: totalOrders ? Math.round((completedOrders.length / totalOrders) * 100) : 0,
      });
    } catch (error) {
      console.error('Failed to fetch owner data:', error);
      if (isManual) toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser || currentUser.role !== 'owner') {
      router.push('/');
      return;
    }
    setUser(currentUser);
    void fetchOwnerData();

    wsService.connect();
    const handleUpdate = () => {
      void fetchOwnerData();
    };

    const handleNotification = (payload: any) => {
      const type = payload?.type;
      if (
        type === 'new_order' ||
        type === 'order_created' ||
        payload?.title?.toLowerCase().includes('order')
      ) {
        playKitchenAlertSound();
        toast.success(payload?.message || '🔔 New kitchen order received!', { duration: 6000 });
        void fetchOwnerData();
      }
    };

    wsService.on('notification', handleNotification);
    wsService.on('order-status-update', handleUpdate);

    // Live auto-refresh polling every 15s
    const pollTimer = setInterval(() => {
      void fetchOwnerData();
    }, 15000);

    return () => {
      clearInterval(pollTimer);
      wsService.off('notification', handleNotification);
      wsService.off('order-status-update', handleUpdate);
    };
  }, [fetchOwnerData, router]);

  const toggleStoreStatus = async () => {
    if (!restaurants || restaurants.length === 0) return;
    const currentRestaurant = restaurants[0];
    const newStatus = currentRestaurant.isOpen === false ? true : false;
    try {
      setTogglingStore(true);
      await api.patch(`/restaurants/${currentRestaurant.id}`, { isOpen: newStatus });
      setRestaurants((prev) =>
        prev.map((r, i) => (i === 0 ? { ...r, isOpen: newStatus } : r)),
      );
      toast.success(
        newStatus
          ? `"${currentRestaurant.name}" is now OPEN for orders`
          : `"${currentRestaurant.name}" is now PAUSED / CLOSED`,
      );
    } catch (err) {
      toast.error('Failed to update restaurant status');
    } finally {
      setTogglingStore(false);
    }
  };

  const openOrderDrawer = async (order: any) => {
    setSelectedDrawerOrder(order);
    try {
      setLoadingDrawerDetails(true);
      const res = await api.get(`/orders/${order.id}`);
      const details = res.data?.data || res.data;
      if (details) {
        setSelectedDrawerOrder(details);
      }
    } catch (err) {
      // Keep basic order
    } finally {
      setLoadingDrawerDetails(false);
    }
  };

  const getStatusBadge = (status: string) => STATUS_META[status] || STATUS_META.pending;

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      setUpdatingDrawerStatus(true);
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success(`Order status updated to ${status}`);
      if (selectedDrawerOrder?.id === orderId) {
        setSelectedDrawerOrder((prev: any) => ({ ...prev, status }));
      }
      fetchOwnerData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingDrawerStatus(false);
    }
  };

  // ✅ Safely get orders for rendering
  const safeOrders = ensureArray(orders);
  const recentOrders = safeOrders.slice(0, 10);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl border border-gray-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-80 bg-gray-100 rounded-2xl border border-gray-100" />
          <div className="h-80 bg-gray-100 rounded-2xl border border-gray-100" />
        </div>
      </div>
    );
  }

  const statusTiles = [
    { key: 'totalOrders', label: 'Total', value: stats.totalOrders, meta: null },
    { key: 'pendingOrders', label: 'Pending', value: stats.pendingOrders, meta: STATUS_META.pending },
    { key: 'preparingOrders', label: 'Preparing', value: stats.preparingOrders, meta: STATUS_META.preparing },
    { key: 'readyOrders', label: 'Ready', value: stats.readyOrders, meta: STATUS_META.ready },
    { key: 'pickedUpOrders', label: 'Picked Up', value: stats.pickedUpOrders, meta: STATUS_META.picked_up },
    { key: 'onTheWayOrders', label: 'On the Way', value: stats.onTheWayOrders, meta: STATUS_META.on_the_way },
    { key: 'completedOrders', label: 'Delivered', value: stats.completedOrders, meta: STATUS_META.delivered },
  ];

  return (
    <div className="space-y-6">
      {/* Dashboard Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Welcome back, {user?.fullName?.split(' ')[0] || 'Owner'} • Kitchen Operations Center
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* Store Open / Paused status button */}
          {restaurants.length > 0 && (
            <button
              type="button"
              onClick={toggleStoreStatus}
              disabled={togglingStore}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition shadow-xs ${
                restaurants[0].isOpen !== false
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
            >
              {togglingStore ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <span
                  className={`w-2 h-2 rounded-full ${
                    restaurants[0].isOpen !== false
                      ? 'bg-emerald-500 animate-pulse'
                      : 'bg-rose-500'
                  }`}
                />
              )}
              <span>
                {restaurants[0].isOpen !== false
                  ? 'Store Open (Accepting Orders)'
                  : 'Store Paused / Closed'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fetchOwnerData(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/owner/orders"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <span>Kitchen Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Pending Orders Triage Alert Banner */}
      {stats.pendingOrders > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl shrink-0">
              <AlertCircle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">
                {stats.pendingOrders} New Order{stats.pendingOrders > 1 ? 's' : ''} Awaiting Kitchen Confirmation!
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Customers are waiting for confirmation. Accept promptly to maintain fast preparation times.
              </p>
            </div>
          </div>
          <Link
            href="/owner/orders"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition whitespace-nowrap shadow-xs text-center"
          >
            Review Pending Orders
          </Link>
        </div>
      )}

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={stats.totalRevenue} icon={DollarSign} trend={stats.revenueGrowth} tint="bg-emerald-50 text-emerald-600" />
        <StatCard title="Total Orders" value={stats.totalOrders} icon={ShoppingBag} trend={stats.orderGrowth} tint="bg-blue-50 text-blue-600" />
        <StatCard title="Completion Rate" value={`${stats.completionRate}%`} icon={CheckCircle} tint="bg-orange-50 text-orange-600" />
        <StatCard title="Avg Rating" value={stats.avgRating} icon={Star} tint="bg-purple-50 text-purple-600" />
      </div>

      {/* Secondary Stats - Order Status Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {statusTiles.map((tile) => (
          <div key={tile.key} className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-black/2 p-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              {tile.meta && <span className={`w-1.5 h-1.5 rounded-full ${tile.meta.dot}`} />}
              <p className="text-xs text-gray-400">{tile.label}</p>
            </div>
            <p className="text-xl font-bold text-gray-900 tabular-nums">{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Revenue & Orders Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 13 }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} dot={false} name="Revenue (৳)" />
              <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Order Status Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 13 }} />
              <Legend />
              <Bar dataKey="pending" fill="#eab308" name="Pending" radius={[4, 4, 0, 0]} />
              <Bar dataKey="preparing" fill="#3b82f6" name="Preparing" radius={[4, 4, 0, 0]} />
              <Bar dataKey="delivered" fill="#10b981" name="Delivered" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">Recent Orders</h3>
            <p className="text-xs text-gray-500 mt-0.5">Track and manage incoming kitchen orders</p>
          </div>
          <Link
            href="/owner/orders"
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <span>Open Kitchen Console</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Order</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Restaurant</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Placed</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-600">No orders yet</p>
                    <p className="text-xs text-gray-400 mt-1">New orders will show up here as they come in.</p>
                  </td>
                </tr>
              ) : (
                recentOrders.map((order) => {
                  const statusInfo = getStatusBadge(order.status);
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-800">
                        #{order.id?.slice(-8).toUpperCase() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{order.restaurant?.name || 'Restaurant'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{order.customerName || 'Customer'}</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 tabular-nums">
                        ৳{formatSafeNumber(parseAmount(order.totalAmount))}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${statusInfo.color} ${statusInfo.ring}`}
                        >
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {order.placedAt ? new Date(order.placedAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-end">
                          {order.status === 'pending' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'preparing')}
                              className="text-xs font-semibold bg-blue-500 text-white px-3 py-1.5 rounded-lg hover:bg-blue-600 transition"
                            >
                              Accept
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'ready')}
                              className="text-xs font-semibold bg-emerald-500 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition"
                            >
                              Mark Ready
                            </button>
                          )}
                          <button
                            onClick={() => openOrderDrawer(order)}
                            className="text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
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

      {/* ============================================================== */}
      {/* IN-DASHBOARD KITCHEN ORDER DRAWER MODAL                        */}
      {/* ============================================================== */}
      {selectedDrawerOrder && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !updatingDrawerStatus) {
              setSelectedDrawerOrder(null);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-base text-gray-900">
                  #{selectedDrawerOrder.id?.slice(0, 8).toUpperCase()}
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ring-1 ring-inset ${
                    getStatusBadge(selectedDrawerOrder.status).color
                  } ${getStatusBadge(selectedDrawerOrder.status).ring}`}
                >
                  {getStatusBadge(selectedDrawerOrder.status).text}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDrawerOrder(null)}
                disabled={updatingDrawerStatus}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="overflow-y-auto p-6 space-y-5">
              {loadingDrawerDetails ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                  <p className="text-xs">Loading order details...</p>
                </div>
              ) : (
                <>
                  {/* Restaurant & Placed Time */}
                  <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <span className="flex items-center gap-1.5 font-medium text-gray-800">
                      <Store className="w-4 h-4 text-orange-500" />
                      {selectedDrawerOrder.restaurant?.name || 'Restaurant'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {selectedDrawerOrder.placedAt
                        ? new Date(selectedDrawerOrder.placedAt).toLocaleString()
                        : '—'}
                    </span>
                  </div>

                  {/* Customer Information */}
                  <div className="p-4 rounded-xl border border-gray-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Customer Details
                      </p>
                      {(selectedDrawerOrder.customerPhone || selectedDrawerOrder.customer?.phone) && (
                        <a
                          href={`tel:${
                            selectedDrawerOrder.customerPhone || selectedDrawerOrder.customer?.phone
                          }`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition"
                        >
                          <Phone className="w-3 h-3" />
                          Call Customer
                        </a>
                      )}
                    </div>
                    <p className="text-sm font-bold text-gray-900">
                      {selectedDrawerOrder.customerName ||
                        selectedDrawerOrder.customer?.fullName ||
                        'Customer'}
                    </p>
                    <p className="text-xs text-gray-600 flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span>{selectedDrawerOrder.deliveryAddress || 'No address provided'}</span>
                    </p>
                    {selectedDrawerOrder.deliveryInstructions && (
                      <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <strong>Kitchen Note:</strong> {selectedDrawerOrder.deliveryInstructions}
                      </p>
                    )}
                  </div>

                  {/* Food Prep Ticket Items */}
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      Ordered Dishes ({selectedDrawerOrder.items?.length || 0})
                    </p>
                    <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                      {selectedDrawerOrder.items && selectedDrawerOrder.items.length > 0 ? (
                        selectedDrawerOrder.items.map((it: any, idx: number) => (
                          <div
                            key={it.id || idx}
                            className="p-3 flex items-center justify-between text-xs hover:bg-gray-50/50"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-800 font-bold flex items-center justify-center text-xs">
                                {it.quantity}x
                              </span>
                              <span className="font-semibold text-gray-800">
                                {it.menuItem?.name || it.name || 'Dish Item'}
                              </span>
                            </div>
                            <span className="font-bold text-gray-900">
                              ৳{(it.unitPrice || it.price || 0) * (it.quantity || 1)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-gray-400">
                          Items not loaded
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Courier Handoff Card if Assigned */}
                  {selectedDrawerOrder.agent && (
                    <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Bike className="w-4 h-4 text-purple-600" />
                        <div>
                          <p className="text-xs font-bold text-purple-900">
                            Assigned Courier: {selectedDrawerOrder.agent.fullName || 'Courier'}
                          </p>
                          <p className="text-[11px] text-purple-700">
                            {selectedDrawerOrder.agent.phone || 'Phone available on assignment'}
                          </p>
                        </div>
                      </div>
                      {selectedDrawerOrder.agent.phone && (
                        <a
                          href={`tel:${selectedDrawerOrder.agent.phone}`}
                          className="px-2.5 py-1 bg-white text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold"
                        >
                          Call
                        </a>
                      )}
                    </div>
                  )}

                  {/* Bill Summary */}
                  <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Total Bill Amount</span>
                    <span className="text-lg font-black text-gray-900">
                      ৳{Number(selectedDrawerOrder.totalAmount || selectedDrawerOrder.total || 0).toLocaleString()}
                    </span>
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
              <Link
                href="/owner/orders"
                className="flex-1 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl text-xs font-semibold text-center hover:bg-gray-100 transition"
              >
                Full Kitchen Console
              </Link>

              {selectedDrawerOrder.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => updateOrderStatus(selectedDrawerOrder.id, 'preparing')}
                  disabled={updatingDrawerStatus}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  {updatingDrawerStatus ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Accept Order</span>
                  )}
                </button>
              )}

              {selectedDrawerOrder.status === 'preparing' && (
                <button
                  type="button"
                  onClick={() => updateOrderStatus(selectedDrawerOrder.id, 'ready')}
                  disabled={updatingDrawerStatus}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  {updatingDrawerStatus ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>Mark Ready for Pickup</span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}