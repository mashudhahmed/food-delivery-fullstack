// app/owner/orders/page.tsx
'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
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
  Phone,
  MapPin,
  X,
  Volume2,
  VolumeX,
  Radio,
  AlertTriangle,
  Loader2,
  Store,
  User,
  Bike,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { wsService } from '@/lib/websocket';
import { playNewOrderAlertSound, playOrderUpdateSound } from '@/lib/sound';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  itemTotal?: number;
  menuItem?: {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
  };
}

interface Order {
  id: string;
  totalAmount: number;
  subtotal?: number;
  deliveryFee?: number;
  tax?: number;
  status: string;
  placedAt: string;
  deliveryAddress: string;
  specialInstructions?: string;
  customerName?: string;
  customerPhone?: string;
  customer?: {
    id: string;
    fullName: string;
    phone?: string;
    email?: string;
  };
  restaurant?: {
    id: string;
    name: string;
    address?: string;
    phone?: string;
  };
  agent?: {
    id: string;
    fullName: string;
    phone?: string;
    vehicleType?: string;
    vehicleNumber?: string;
  };
  items?: OrderItem[];
}

const ensureArray = (data: unknown): any[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.items)) return record.items;
    if (Array.isArray(record.orders)) return record.orders;
    if (Array.isArray(record.results)) return record.results;
  }
  return [];
};

const STATUS_META: Record<
  string,
  { color: string; ring: string; icon: React.ReactNode; text: string; dot: string }
> = {
  pending: {
    color: 'bg-amber-50 text-amber-700',
    ring: 'ring-amber-200',
    icon: <Clock className="w-3.5 h-3.5" />,
    text: 'Pending',
    dot: 'bg-amber-500',
  },
  preparing: {
    color: 'bg-blue-50 text-blue-700',
    ring: 'ring-blue-200',
    icon: <Package className="w-3.5 h-3.5" />,
    text: 'Preparing',
    dot: 'bg-blue-500',
  },
  ready: {
    color: 'bg-emerald-50 text-emerald-700',
    ring: 'ring-emerald-200',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    text: 'Ready for Pickup',
    dot: 'bg-emerald-500',
  },
  picked_up: {
    color: 'bg-purple-50 text-purple-700',
    ring: 'ring-purple-200',
    icon: <Truck className="w-3.5 h-3.5" />,
    text: 'Picked Up',
    dot: 'bg-purple-500',
  },
  on_the_way: {
    color: 'bg-indigo-50 text-indigo-700',
    ring: 'ring-indigo-200',
    icon: <Navigation className="w-3.5 h-3.5" />,
    text: 'On the Way',
    dot: 'bg-indigo-500',
  },
  delivered: {
    color: 'bg-gray-100 text-gray-600',
    ring: 'ring-gray-200',
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    text: 'Delivered',
    dot: 'bg-gray-400',
  },
  cancelled: {
    color: 'bg-red-50 text-red-700',
    ring: 'ring-red-200',
    icon: <XCircle className="w-3.5 h-3.5" />,
    text: 'Cancelled',
    dot: 'bg-red-500',
  },
};

const PRESET_CANCEL_REASONS = [
  'Item out of stock / ingredient unavailable',
  'Kitchen at maximum capacity',
  'Outside restaurant operating hours',
  'Customer requested cancellation',
  'Unable to deliver to customer address',
];

function OwnerOrdersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantIdParam = searchParams.get('restaurant');

  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Kitchen Drawer Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailedOrder, setDetailedOrder] = useState<Order | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Cancellation Modal State
  const [cancelingOrder, setCancelingOrder] = useState<Order | null>(null);
  const [cancelReasonPreset, setCancelReasonPreset] = useState(PRESET_CANCEL_REASONS[0]);
  const [cancelCustomNotes, setCancelCustomNotes] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Kitchen Controls
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [livePolling, setLivePolling] = useState(true);

  const fetchOrders = useCallback(
    async (silent = false) => {
      if (!silent) setRefreshing(true);
      try {
        let allOrders: Order[] = [];
        try {
          const ordersRes = await api.get('/orders/my-restaurant');
          allOrders = ensureArray(ordersRes.data);
        } catch {
          const allOrdersRes = await api.get('/orders');
          const allOrdersData = ensureArray(allOrdersRes.data);
          const restaurantIds = restaurants.map((r) => r.id);
          allOrders = allOrdersData.filter((order: Order) =>
            restaurantIds.includes(order.restaurant?.id || '')
          );
        }

        if (selectedRestaurant) {
          allOrders = allOrders.filter(
            (order) => order.restaurant?.id === selectedRestaurant
          );
        }

        setOrders(allOrders);

        // If drawer is open, keep detailed order updated
        if (selectedOrder) {
          const updated = allOrders.find((o) => o.id === selectedOrder.id);
          if (updated) {
            setSelectedOrder((prev) => (prev ? { ...prev, ...updated } : null));
          }
        }
      } catch (error) {
        console.error('Failed to load orders:', error);
        toast.error('Failed to load orders');
        setOrders([]);
      } finally {
        setRefreshing(false);
      }
    },
    [restaurants, selectedRestaurant, selectedOrder]
  );

  const fetchData = useCallback(async () => {
    try {
      const currentUser = auth.getCurrentUser();
      const restaurantsRes = await api.get(`/restaurants?ownerId=${currentUser?.id}`);
      const ownerRestaurants = ensureArray(restaurantsRes.data);
      setRestaurants(ownerRestaurants);

      if (ownerRestaurants.length > 0 && !selectedRestaurant) {
        setSelectedRestaurant(ownerRestaurants[0].id);
      }
    } catch (error) {
      console.error('Failed to load restaurants:', error);
      toast.error('Failed to load restaurants');
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, [selectedRestaurant]);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser || currentUser.role !== 'owner') {
      router.push('/');
      return;
    }
    fetchData();
  }, [router, fetchData]);

  useEffect(() => {
    if (restaurantIdParam && restaurants.length > 0) {
      setSelectedRestaurant(restaurantIdParam);
    }
  }, [restaurantIdParam, restaurants]);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchOrders();
    }
  }, [selectedRestaurant, fetchOrders]);

  // Live 15s Polling Interval for busy kitchens
  useEffect(() => {
    if (!livePolling) return;
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [livePolling, fetchOrders]);

  // WebSocket Live Dispatch Listener
  useEffect(() => {
    wsService.connect();

    const handleNotification = (payload: any) => {
      const type = payload?.type;
      if (type === 'order_new' || payload?.title?.toLowerCase().includes('new order')) {
        if (soundEnabled) playNewOrderAlertSound();
        toast.success(payload?.message || '🔔 New order received!', { duration: 6000 });
        fetchOrders(true);
      } else if (type === 'order_cancelled' || type === 'order_status') {
        if (soundEnabled) playOrderUpdateSound();
        fetchOrders(true);
      }
    };

    const handleNewOrder = () => {
      if (soundEnabled) playNewOrderAlertSound();
      toast.success('🔔 New order received!', { duration: 6000 });
      fetchOrders(true);
    };

    const handleOrderUpdate = () => {
      if (soundEnabled) playOrderUpdateSound();
      fetchOrders(true);
    };

    wsService.on('notification', handleNotification);
    wsService.on('new-order', handleNewOrder);
    wsService.on('order-status-update', handleOrderUpdate);

    return () => {
      wsService.off('notification', handleNotification);
      wsService.off('new-order', handleNewOrder);
      wsService.off('order-status-update', handleOrderUpdate);
    };
  }, [soundEnabled, fetchOrders]);

  // Escape key closes modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedOrder(null);
        setCancelingOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch deep order details when opening the drawer
  const handleOpenOrderDrawer = async (order: Order) => {
    setSelectedOrder(order);
    setDetailLoading(true);
    try {
      const res = await api.get(`/orders/${order.id}`);
      const data = res.data?.data ?? res.data;
      setDetailedOrder(data);
    } catch (err) {
      console.error('Failed to fetch full order details:', err);
      // Fallback to table order
      setDetailedOrder(order);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success(`Order updated to ${status.replace(/_/g, ' ')}`);

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );

      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status } : null));
      }
      if (detailedOrder?.id === orderId) {
        setDetailedOrder((prev) => (prev ? { ...prev, status } : null));
      }

      fetchOrders(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenCancelModal = (order: Order) => {
    setCancelingOrder(order);
    setCancelReasonPreset(PRESET_CANCEL_REASONS[0]);
    setCancelCustomNotes('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelingOrder) return;
    setCancelLoading(true);
    try {
      await api.patch(`/orders/${cancelingOrder.id}/status`, { status: 'cancelled' });
      toast.success('Order cancelled successfully');
      setOrders((prev) =>
        prev.map((o) => (o.id === cancelingOrder.id ? { ...o, status: 'cancelled' } : o))
      );
      if (selectedOrder?.id === cancelingOrder.id) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
      }
      if (detailedOrder?.id === cancelingOrder.id) {
        setDetailedOrder((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
      }
      setCancelingOrder(null);
      fetchOrders(true);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelLoading(false);
    }
  };

  const safeOrders = useMemo(() => (Array.isArray(orders) ? orders : []), [orders]);

  const filteredOrders = useMemo(() => {
    return safeOrders.filter((order) => {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        order.id?.toLowerCase().includes(term) ||
        (order.customerName?.toLowerCase() || '').includes(term) ||
        (order.customer?.fullName?.toLowerCase() || '').includes(term) ||
        order.deliveryAddress?.toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [safeOrders, searchTerm, statusFilter]);

  const statusCounts = useMemo(
    () => ({
      pending: safeOrders.filter((o) => o.status === 'pending').length,
      preparing: safeOrders.filter((o) => o.status === 'preparing').length,
      ready: safeOrders.filter((o) => o.status === 'ready').length,
      picked_up: safeOrders.filter((o) => o.status === 'picked_up').length,
      on_the_way: safeOrders.filter((o) => o.status === 'on_the_way').length,
      delivered: safeOrders.filter((o) => o.status === 'delivered').length,
      cancelled: safeOrders.filter((o) => o.status === 'cancelled').length,
    }),
    [safeOrders]
  );

  const filterTabs = [
    { id: 'all', label: 'All Orders', count: safeOrders.length },
    { id: 'pending', label: 'Pending', count: statusCounts.pending },
    { id: 'preparing', label: 'In Kitchen', count: statusCounts.preparing },
    { id: 'ready', label: 'Ready for Pickup', count: statusCounts.ready },
    { id: 'picked_up', label: 'Picked Up', count: statusCounts.picked_up },
    { id: 'on_the_way', label: 'On The Way', count: statusCounts.on_the_way },
    { id: 'delivered', label: 'Delivered', count: statusCounts.delivered },
    { id: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled },
  ];

  const heroStats = [
    {
      id: 'pending',
      label: 'Needs attention',
      count: statusCounts.pending,
      meta: STATUS_META.pending,
      live: true,
    },
    {
      id: 'preparing',
      label: 'Cooking in kitchen',
      count: statusCounts.preparing,
      meta: STATUS_META.preparing,
    },
    {
      id: 'ready',
      label: 'Ready for courier',
      count: statusCounts.ready,
      meta: STATUS_META.ready,
    },
    {
      id: 'delivered',
      label: 'Delivered today',
      count: statusCounts.delivered,
      meta: STATUS_META.delivered,
    },
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
      {/* Header with Kitchen Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kitchen Orders Console</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time kitchen order tickets, prep status, and dispatch handoffs
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Audio Alert Toggle */}
          <button
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              toast.success(`Kitchen audio alerts ${next ? 'enabled' : 'muted'}`);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
              soundEnabled
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
            }`}
            title={soundEnabled ? 'Kitchen alerts are loud' : 'Kitchen alerts are muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Sound ON' : 'Muted'}</span>
          </button>

          {/* Live 15s Polling Toggle */}
          <button
            onClick={() => {
              setLivePolling(!livePolling);
              toast.success(`Live sync ${!livePolling ? 'resumed' : 'paused'}`);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
              livePolling
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
            }`}
            title="15-second automatic kitchen sync"
          >
            <Radio className={`w-3.5 h-3.5 ${livePolling ? 'animate-pulse text-blue-600' : ''}`} />
            <span>{livePolling ? 'Live 15s' : 'Paused'}</span>
          </button>

          {/* Manual Refresh */}
          <button
            onClick={() => fetchOrders()}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 bg-white border border-gray-200 px-3.5 py-2 rounded-xl hover:bg-gray-50 transition disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {heroStats.map((stat) => (
          <div
            key={stat.id}
            className="relative bg-white rounded-2xl border border-gray-100 p-4 shadow-sm shadow-black/2"
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`flex items-center justify-center w-9 h-9 rounded-xl ${stat.meta.color}`}
              >
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

      {/* Restaurant Selector Tabs (if owner has multiple) */}
      {restaurants.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
          {restaurants.map((restaurant) => (
            <button
              key={restaurant.id}
              onClick={() => setSelectedRestaurant(restaurant.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap border cursor-pointer ${
                selectedRestaurant === restaurant.id
                  ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {restaurant.name}
            </button>
          ))}
        </div>
      )}

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by order ID, customer name, or address..."
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

      {/* Quick Status Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterTabs.map((tab) => {
          const meta = tab.id === 'all' ? null : STATUS_META[tab.id];
          const active = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                active
                  ? 'bg-orange-500 text-white shadow-xs'
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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Order Ticket
                </th>
                <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Customer
                </th>
                <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Amount
                </th>
                <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Kitchen Status
                </th>
                <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Placed
                </th>
                <th className="text-right px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-600">
                      {safeOrders.length === 0 ? 'No orders yet' : 'No orders match your filter'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {safeOrders.length === 0
                        ? 'New orders for this restaurant will show up here.'
                        : 'Try adjusting your search keywords or status filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusInfo = STATUS_META[order.status] || STATUS_META.pending;
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div
                          onClick={() => handleOpenOrderDrawer(order)}
                          className="cursor-pointer group inline-block"
                        >
                          <span className="font-mono text-sm font-bold text-gray-900 group-hover:text-orange-600 transition">
                            #{order.id?.slice(-8).toUpperCase() || 'N/A'}
                          </span>
                          <p className="text-xs text-gray-400 truncate max-w-[200px] mt-0.5">
                            {order.deliveryAddress || 'Delivery Address'}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <p className="font-semibold text-gray-800">
                          {order.customer?.fullName || order.customerName || 'Customer'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {order.customer?.phone || order.customerPhone || 'No contact'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 tabular-nums">
                        ৳{Number(order.totalAmount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ring-1 ring-inset ${statusInfo.color} ${statusInfo.ring}`}
                        >
                          {statusInfo.icon}
                          {statusInfo.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {order.placedAt ? new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recent'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2 justify-end items-center">
                          {order.status === 'pending' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'preparing')}
                              disabled={updatingId === order.id}
                              className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
                            >
                              {updatingId === order.id ? 'Accepting...' : 'Accept & Cook'}
                            </button>
                          )}
                          {order.status === 'preparing' && (
                            <button
                              onClick={() => updateOrderStatus(order.id, 'ready')}
                              disabled={updatingId === order.id}
                              className="text-xs font-semibold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition cursor-pointer shadow-xs"
                            >
                              {updatingId === order.id ? 'Updating...' : 'Mark Ready'}
                            </button>
                          )}
                          {['pending', 'preparing'].includes(order.status) && (
                            <button
                              onClick={() => handleOpenCancelModal(order)}
                              className="text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                              title="Cancel / Reject Order"
                            >
                              Cancel
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenOrderDrawer(order)}
                            className="text-xs font-semibold text-gray-600 border border-gray-200 px-2.5 py-1.5 rounded-lg hover:bg-gray-100 flex items-center gap-1 transition cursor-pointer"
                            title="View Kitchen Ticket"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ticket
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

      {/* ======================================================== */}
      {/* 1. IN-APP KITCHEN ORDER DRAWER (REPLACES REDIRECT)       */}
      {/* ======================================================== */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-sm">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900 font-mono">
                      #{selectedOrder.id?.slice(-8).toUpperCase()}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                        (STATUS_META[selectedOrder.status] || STATUS_META.pending).color
                      }`}
                    >
                      {(STATUS_META[selectedOrder.status] || STATUS_META.pending).text}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Placed at{' '}
                    {selectedOrder.placedAt
                      ? new Date(selectedOrder.placedAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Recently'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {detailLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
                  <p className="text-xs">Loading items and customer notes...</p>
                </div>
              ) : (
                <>
                  {/* Action Banner inside Drawer */}
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Current Prep Stage
                      </p>
                      <p className="text-sm font-bold text-gray-900 capitalize mt-0.5">
                        {selectedOrder.status.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedOrder.status === 'pending' && (
                        <button
                          disabled={updatingId === selectedOrder.id}
                          onClick={() => updateOrderStatus(selectedOrder.id, 'preparing')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          Accept &amp; Cook
                        </button>
                      )}
                      {selectedOrder.status === 'preparing' && (
                        <button
                          disabled={updatingId === selectedOrder.id}
                          onClick={() => updateOrderStatus(selectedOrder.id, 'ready')}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          Mark Ready
                        </button>
                      )}
                      {['pending', 'preparing'].includes(selectedOrder.status) && (
                        <button
                          onClick={() => handleOpenCancelModal(selectedOrder)}
                          className="px-3 py-2 bg-white hover:bg-rose-50 text-rose-600 text-xs font-bold border border-rose-200 rounded-xl transition cursor-pointer"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Kitchen Item Ticket Breakdown */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Order Items Ticket
                    </h4>
                    <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-50 overflow-hidden shadow-xs">
                      {detailedOrder?.items && detailedOrder.items.length > 0 ? (
                        detailedOrder.items.map((item, idx) => (
                          <div key={item.id || idx} className="p-3.5 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center shrink-0">
                                {item.quantity}x
                              </span>
                              <div>
                                <p className="font-semibold text-sm text-gray-900">
                                  {item.menuItem?.name || `Item #${idx + 1}`}
                                </p>
                                {item.menuItem?.description && (
                                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">
                                    {item.menuItem.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="font-bold text-sm text-gray-900 tabular-nums">
                              ৳{Number(item.price * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-gray-400 text-xs">
                          No specific item records attached
                        </div>
                      )}
                    </div>

                    {/* Order Financials */}
                    <div className="mt-3 p-3 bg-gray-50/70 rounded-xl border border-gray-100 space-y-1.5 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Items Subtotal</span>
                        <span className="font-medium text-gray-900">
                          ৳{Number(detailedOrder?.subtotal || selectedOrder.totalAmount).toLocaleString()}
                        </span>
                      </div>
                      {detailedOrder?.deliveryFee !== undefined && (
                        <div className="flex justify-between">
                          <span>Delivery Fee</span>
                          <span className="font-medium text-gray-900">
                            ৳{Number(detailedOrder.deliveryFee).toLocaleString()}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-gray-200/60 pt-1.5 flex justify-between font-bold text-sm text-gray-900">
                        <span>Grand Total</span>
                        <span className="text-orange-600">
                          ৳{Number(selectedOrder.totalAmount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Customer & Delivery Address Card */}
                  <div className="p-4 bg-gray-50/80 rounded-xl border border-gray-100 space-y-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Customer &amp; Delivery Destination
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Recipient Name</p>
                        <p className="font-semibold text-gray-900 mt-0.5">
                          {detailedOrder?.customer?.fullName || selectedOrder.customerName || 'Customer'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Phone</p>
                        {detailedOrder?.customer?.phone || selectedOrder.customerPhone ? (
                          <a
                            href={`tel:${detailedOrder?.customer?.phone || selectedOrder.customerPhone}`}
                            className="font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1 mt-0.5"
                          >
                            <Phone className="w-3 h-3" />
                            {detailedOrder?.customer?.phone || selectedOrder.customerPhone}
                          </a>
                        ) : (
                          <p className="text-gray-500 mt-0.5 text-xs">No phone provided</p>
                        )}
                      </div>
                      <div className="col-span-full">
                        <p className="text-xs text-gray-400">Delivery Address</p>
                        <p className="text-xs text-gray-700 mt-0.5 flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                          <span>{selectedOrder.deliveryAddress || 'Standard delivery address'}</span>
                        </p>
                      </div>
                      {selectedOrder.specialInstructions && (
                        <div className="col-span-full p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs">
                          <strong>Cooking Note:</strong> {selectedOrder.specialInstructions}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Courier Card (if assigned) */}
                  {detailedOrder?.agent && (
                    <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2">
                      <h4 className="text-xs font-semibold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                        <Bike className="w-3.5 h-3.5" /> Assigned Delivery Courier
                      </h4>
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {detailedOrder.agent.fullName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {detailedOrder.agent.vehicleType || 'Courier'} •{' '}
                            {detailedOrder.agent.vehicleNumber || 'Plate pending'}
                          </p>
                        </div>
                        {detailedOrder.agent.phone && (
                          <a
                            href={`tel:${detailedOrder.agent.phone}`}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition flex items-center gap-1"
                          >
                            <Phone className="w-3 h-3" /> Call Driver
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex justify-between items-center">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Close Ticket
              </button>
              {selectedOrder && ['pending', 'preparing'].includes(selectedOrder.status) && (
                <button
                  onClick={() => handleOpenCancelModal(selectedOrder)}
                  className="px-3.5 py-2 text-rose-600 hover:bg-rose-50 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. CANCEL / REJECT REASON MODAL                          */}
      {/* ======================================================== */}
      {cancelingOrder && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setCancelingOrder(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Cancel Kitchen Order</h3>
                  <p className="text-xs text-gray-500 font-mono">
                    Order #{cancelingOrder.id?.slice(-8).toUpperCase()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCancelingOrder(null)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Cancellation Reason
                </label>
                <select
                  value={cancelReasonPreset}
                  onChange={(e) => setCancelReasonPreset(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 bg-white cursor-pointer"
                >
                  {PRESET_CANCEL_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Sold out of specific item..."
                  value={cancelCustomNotes}
                  onChange={(e) => setCancelCustomNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition resize-none"
                />
              </div>

              <div className="p-3 bg-rose-50/70 rounded-xl border border-rose-100 text-[11px] text-rose-700 leading-relaxed">
                Cancelling this order stops the kitchen prep and notifies the customer immediately.
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelingOrder(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                Keep Order
              </button>
              <button
                type="button"
                disabled={cancelLoading}
                onClick={handleConfirmCancel}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {cancelLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
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