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
  Wallet
} from 'lucide-react';

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
      
      orders.forEach(order => {
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
      setOrders(response.data);
      setFilteredOrders(response.data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (activeFilter !== 'all') {
      filtered = filtered.filter(order => order.status === activeFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.restaurant?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredOrders(filtered);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      preparing: 'bg-blue-100 text-blue-800 border-blue-200',
      ready: 'bg-purple-100 text-purple-800 border-purple-200',
      picked_up: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      delivered: 'bg-green-100 text-green-800 border-green-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'Order Placed',
      preparing: 'Being Prepared',
      ready: 'Ready for Pickup',
      picked_up: 'On the Way',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return texts[status] || status.replace('_', ' ');
  };

  const getPaymentMethodDisplay = (method: string) => {
    const methods: Record<string, { label: string; icon: JSX.Element; color: string }> = {
      cash: { 
        label: 'Cash on Delivery', 
        icon: <Wallet className="w-3.5 h-3.5" />,
        color: 'bg-green-100 text-green-700 border-green-200'
      },
      card: { 
        label: 'Credit/Debit Card', 
        icon: <CreditCard className="w-3.5 h-3.5" />,
        color: 'bg-blue-100 text-blue-700 border-blue-200'
      },
      bkash: { 
        label: 'bKash', 
        icon: <CreditCard className="w-3.5 h-3.5" />,
        color: 'bg-pink-100 text-pink-700 border-pink-200'
      },
    };
    const defaultMethod = { 
      label: method || 'Cash on Delivery', 
      icon: <Wallet className="w-3.5 h-3.5" />,
      color: 'bg-gray-100 text-gray-700 border-gray-200'
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading your orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-500 mt-1">Track and manage your orders</p>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by restaurant or order ID"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 overflow-x-auto pb-2">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                activeFilter === filter.value
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {filter.label}
              {filter.value !== 'all' && (
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                  activeFilter === filter.value
                    ? 'bg-white/20 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {orders.filter(o => o.status === filter.value).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Results Summary */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-500">
            {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
          </p>
        </div>

        {/* Orders List */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No orders found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm || activeFilter !== 'all' 
                ? "Try adjusting your filters or search term"
                : "You haven't placed any orders yet"}
            </p>
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-orange-600 transition"
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
              const paymentInfo = getPaymentMethodDisplay(order.paymentMethod || 'cash');
              
              return (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200">
                  <Link href={`/orders/${order.id}`} className="block">
                    <div className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        {/* Left Section */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                              {getStatusText(order.status)}
                            </span>
                            <span className="text-xs text-gray-400">
                              #{order.id.slice(-8).toUpperCase()}
                            </span>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${paymentInfo.color}`}>
                              {paymentInfo.icon}
                              {paymentInfo.label}
                            </span>
                          </div>
                          
                          <h3 className="font-semibold text-gray-800 text-lg mb-1 group-hover:text-orange-500 transition">
                            {order.restaurant?.name}
                          </h3>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
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
                        <div className="flex items-center justify-between sm:justify-end gap-6">
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Total Amount</p>
                            <p className="text-xl font-bold text-orange-600">৳{order.totalAmount}</p>
                            <p className="text-xs text-gray-400 mt-1">Incl. all fees & tax</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-orange-500 transition" />
                        </div>
                      </div>
                    </div>
                  </Link>
                  
                  {/* Cancel Order Button - Opens Modal */}
                  {cancelable && timer && (
                    <div className="px-5 pb-5 pt-0 border-t border-gray-50 bg-gray-50/30">
                      <div className="flex items-center justify-between">
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
                          className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
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