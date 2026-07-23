'use client';

import { JSX, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '../../lib/api';
import { Order } from '../../types';
import toast from 'react-hot-toast';
import CancelOrderModal from '@/components/CancelOrderModal';
import {
  Package,
  Clock,
  ChevronRight,
  Calendar,
  CreditCard,
  Search,
  XCircle,
  AlertCircle,
  Wallet,
} from 'lucide-react';

const STATUS_META: Record<string, { text: string; color: string; ring: string; dot: string }> = {
  pending: { text: 'Order Placed', color: 'bg-amber-50 text-amber-700', ring: 'ring-amber-200', dot: 'bg-amber-500' },
  preparing: { text: 'Being Prepared', color: 'bg-blue-50 text-blue-700', ring: 'ring-blue-200', dot: 'bg-blue-500' },
  ready: { text: 'Ready for Pickup', color: 'bg-purple-50 text-purple-700', ring: 'ring-purple-200', dot: 'bg-purple-500' },
  picked_up: { text: 'On the Way', color: 'bg-indigo-50 text-indigo-700', ring: 'ring-indigo-200', dot: 'bg-indigo-500' },
  delivered: { text: 'Delivered', color: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500' },
  cancelled: { text: 'Cancelled', color: 'bg-red-50 text-red-700', ring: 'ring-red-200', dot: 'bg-red-500' },
};

// ✅ Helper to ensure array, in case the API wraps the list in an object
const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.orders && Array.isArray(data.orders)) return data.orders;
  console.warn('⚠️ Unexpected data format for orders:', typeof data, data);
  return [];
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [timers, setTimers] = useState<Record<string, { minutes: number; seconds: number }>>({});

  const filters = [
    { value: 'all', label: 'All Orders' },
    { value: 'pending', label: 'Pending' },
    { value: 'preparing', label: 'Preparing' },
    { value: 'ready', label: 'Ready' },
    { value: 'picked_up', label: 'On the Way' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, activeFilter, searchTerm]);

  // Real-time timer for cancel buttons
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimers: Record<string, { minutes: number; seconds: number }> = {};

      orders.forEach((order) => {
        if (order.status === 'pending') {
          const orderTime = new Date(order.placedAt).getTime();
          const currentTime = new Date().getTime();
          const secondsPassed = (currentTime - orderTime) / 1000;
          const secondsRemaining = Math.max(0, 300 - secondsPassed);

          if (secondsRemaining > 0) {
            const minutes = Math.floor(secondsRemaining / 60);
            const seconds = Math.floor(secondsRemaining % 60);
            newTimers[order.id] = { minutes, seconds };
          }
        }
      });

      setTimers(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [orders]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/orders/my');
      const safeOrders = ensureArray(response.data);
      setOrders(safeOrders);
      setFilteredOrders(safeOrders);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (activeFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === activeFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(
        (order) =>
          order.restaurant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  };

  const getStatusMeta = (status: string) => STATUS_META[status] || STATUS_META.pending;

  const getPaymentMethodDisplay = (method: string) => {
    const methods: Record<string, { label: string; icon: JSX.Element; tint: string }> = {
      cash: { label: 'Cash on Delivery', icon: <Wallet className="w-3.5 h-3.5" />, tint: 'bg-emerald-50 text-emerald-700' },
      card: { label: 'Credit/Debit Card', icon: <CreditCard className="w-3.5 h-3.5" />, tint: 'bg-blue-50 text-blue-700' },
      bkash: { label: 'bKash', icon: <CreditCard className="w-3.5 h-3.5" />, tint: 'bg-pink-50 text-pink-700' },
    };
    const defaultMethod = {
      label: method || 'Cash on Delivery',
      icon: <Wallet className="w-3.5 h-3.5" />,
      tint: 'bg-gray-100 text-gray-600',
    };
    return methods[method] || defaultMethod;
  };

  const canCancelOrder = (order: Order) => {
    if (order.status !== 'pending') return false;
    const orderTime = new Date(order.placedAt).getTime();
    const currentTime = new Date().getTime();
    const minutesPassed = (currentTime - orderTime) / (1000 * 60);
    return minutesPassed <= 5;
  };

  const openCancelModal = (order: Order) => {
    setSelectedOrder(order);
    setModalOpen(true);
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;

    setCancellingOrderId(selectedOrder.id);
    try {
      await api.delete(`/orders/${selectedOrder.id}`);
      toast.success('Order cancelled successfully');
      setModalOpen(false);
      setSelectedOrder(null);
      await fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancellingOrderId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 space-y-6 animate-pulse">
          <div className="h-8 w-40 bg-gray-200 rounded-lg" />
          <div className="h-10 w-72 bg-gray-100 rounded-xl" />
          <div className="flex gap-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-9 w-24 bg-gray-100 rounded-full" />
            ))}
          </div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-white rounded-2xl border border-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-sm text-gray-500 mt-1">Track and manage your orders</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by restaurant or order ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-1">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                activeFilter === filter.value
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {filter.label}
              {filter.value !== 'all' && (
                <span className={`ml-2 ${activeFilter === filter.value ? 'text-white/80' : 'text-gray-400'}`}>
                  {orders.filter((o) => o.status === filter.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Results Summary */}
        <p className="text-sm text-gray-400 mb-4">
          {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
        </p>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-14 text-center">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <h3 className="text-sm font-semibold text-gray-700 mb-1">No orders found</h3>
            <p className="text-sm text-gray-400 mb-6">
              {searchTerm || activeFilter !== 'all' ? 'Try adjusting your filters or search term' : "You haven't placed any orders yet"}
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-600 transition shadow-sm shadow-orange-200"
            >
              Browse Restaurants
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const cancelable = canCancelOrder(order);
              const timer = timers[order.id];
              const statusMeta = getStatusMeta(order.status);
              const paymentInfo = getPaymentMethodDisplay(order.paymentMethod || 'cash');

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden hover:shadow-md hover:shadow-black/4 transition-shadow"
                >
                  <Link href={`/orders/${order.id}`} className="block group">
                    <div className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Left Section */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${statusMeta.color} ${statusMeta.ring}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                              {statusMeta.text}
                            </span>
                            <span className="text-xs text-gray-400">#{order.id?.slice(-8).toUpperCase() || 'N/A'}</span>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${paymentInfo.tint}`}>
                              {paymentInfo.icon}
                              {paymentInfo.label}
                            </span>
                          </div>

                          <h3 className="font-semibold text-gray-900 text-base mb-1.5 group-hover:text-orange-600 transition truncate">
                            {order.restaurant?.name}
                          </h3>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(order.placedAt).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {new Date(order.placedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Package className="w-3.5 h-3.5" />
                              {order.items?.length || 0} item(s)
                            </span>
                          </div>
                        </div>

                        {/* Right Section */}
                        <div className="flex items-center justify-between sm:justify-end gap-6 shrink-0">
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Total Amount</p>
                            <p className="text-xl font-bold text-orange-600 tabular-nums">৳{order.totalAmount}</p>
                            <p className="text-[11px] text-gray-300 mt-0.5">Incl. all fees & tax</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-orange-500 transition" />
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Cancel Order Button - Opens Modal */}
                  {cancelable && timer && (
                    <div className="px-5 pb-5 pt-0 border-t border-gray-50 bg-gray-50/30">
                      <div className="flex items-center justify-between pt-4">
                        <div className="flex items-center gap-2 text-sm text-amber-600">
                          <AlertCircle className="w-4 h-4" />
                          <span>
                            Cancel within {timer.minutes}:{String(timer.seconds).padStart(2, '0')}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            openCancelModal(order);
                          }}
                          disabled={cancellingOrderId === order.id}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition disabled:opacity-50"
                        >
                          <XCircle className="w-4 h-4" />
                          Cancel Order
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Order Modal */}
      <CancelOrderModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedOrder(null);
        }}
        onConfirm={handleCancelOrder}
        orderId={selectedOrder?.id || ''}
        orderTotal={selectedOrder?.totalAmount}
        restaurantName={selectedOrder?.restaurant?.name}
        paymentMethod={selectedOrder?.paymentMethod}
        timeRemaining={selectedOrder ? timers[selectedOrder.id] : null}
        loading={cancellingOrderId === selectedOrder?.id}
      />
    </div>
  );
}