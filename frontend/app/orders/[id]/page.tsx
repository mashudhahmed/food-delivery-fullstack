'use client';

import { JSX, useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Order } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import CancelOrderModal from '@/components/CancelOrderModal';
import {
  ChevronLeft,
  MapPin,
  Phone,
  Clock,
  Package,
  CreditCard,
  Home,
  Truck,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
  Navigation,
  Wallet,
  Smartphone,
  XCircle,
} from 'lucide-react';

const STATUS_META: Record<string, { text: string; color: string; ring: string; dot: string }> = {
  pending: { text: 'Order Placed', color: 'bg-amber-50 text-amber-700', ring: 'ring-amber-200', dot: 'bg-amber-500' },
  preparing: { text: 'Being Prepared', color: 'bg-blue-50 text-blue-700', ring: 'ring-blue-200', dot: 'bg-blue-500' },
  ready: { text: 'Ready for Pickup', color: 'bg-purple-50 text-purple-700', ring: 'ring-purple-200', dot: 'bg-purple-500' },
  picked_up: { text: 'Picked Up', color: 'bg-indigo-50 text-indigo-700', ring: 'ring-indigo-200', dot: 'bg-indigo-500' },
  on_the_way: { text: 'On the Way', color: 'bg-orange-50 text-orange-700', ring: 'ring-orange-200', dot: 'bg-orange-500' },
  delivered: { text: 'Delivered', color: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500' },
  cancelled: { text: 'Cancelled', color: 'bg-red-50 text-red-700', ring: 'ring-red-200', dot: 'bg-red-500' },
};

// ✅ Unwrap a single-object API response that may be wrapped
// (e.g. { data: {...} } or { order: {...} }) instead of returned bare.
const unwrapOrder = (raw: any): any => {
  if (!raw) return null;
  if (raw.id) return raw; // already a bare order object
  if (raw.data?.id) return raw.data;
  if (raw.order?.id) return raw.order;
  console.warn('⚠️ Unexpected order response shape:', raw);
  return raw.data || raw.order || raw;
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackingProgress, setTrackingProgress] = useState(0);
  const [subtotal, setSubtotal] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{ minutes: number; seconds: number } | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const hasRefreshedRef = useRef(false);

  // Memoize fetchOrderDetails to prevent unnecessary re-renders
  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${id}`);
      const orderData = unwrapOrder(response.data);
      if (!orderData || !orderData.id) {
        toast.error('Order data is malformed');
        setOrder(null);
        return;
      }
      setOrder(orderData);
      calculateTrackingProgress(orderData.status);

      const calculatedSubtotal =
        orderData.items?.reduce((sum: number, item: any) => sum + item.unitPrice * item.quantity, 0) || 0;
      setSubtotal(calculatedSubtotal);

      // Reset refresh flag when order status changes from pending
      if (orderData.status !== 'pending') {
        hasRefreshedRef.current = false;
      }
    } catch (error) {
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const calculateTrackingProgress = (status: string) => {
    const progressMap: Record<string, number> = {
      pending: 16,
      preparing: 33,
      ready: 50,
      picked_up: 66,
      on_the_way: 83,
      delivered: 100,
      cancelled: 0,
    };
    setTrackingProgress(progressMap[status] || 0);
  };

  // Initial load
  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  // Real-time timer for cancel button - NO API calls here
  useEffect(() => {
    if (!order) return;

    const updateTimer = () => {
      if (order.status === 'pending') {
        const orderTime = new Date(order.placedAt).getTime();
        const currentTime = new Date().getTime();
        const secondsPassed = (currentTime - orderTime) / 1000;
        const secondsRemaining = Math.max(0, 300 - secondsPassed);

        if (secondsRemaining > 0) {
          const minutes = Math.floor(secondsRemaining / 60);
          const seconds = Math.floor(secondsRemaining % 60);
          setTimeRemaining({ minutes, seconds });
        } else {
          // Only refresh once when time expires
          if (!hasRefreshedRef.current) {
            hasRefreshedRef.current = true;
            setTimeRemaining(null);
            fetchOrderDetails(); // Refresh to update order status
          }
        }
      } else {
        setTimeRemaining(null);
        hasRefreshedRef.current = false;
      }
    };

    // Update timer immediately
    updateTimer();

    // Set interval for timer display only (no API calls on every tick)
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [order?.status, order?.placedAt, fetchOrderDetails]);

  const getStatusMeta = (status: string) => STATUS_META[status] || STATUS_META.pending;

  const getEstimatedTime = () => {
    if (order?.status === 'delivered') return 'Delivered';
    if (order?.status === 'cancelled') return 'Cancelled';
    return '30-45 minutes';
  };

  const getPaymentMethodDisplay = (method: string) => {
    const methods: Record<string, { label: string; icon: JSX.Element; description: string; color: string; tint: string }> = {
      cash: {
        label: 'Cash on Delivery',
        icon: <Wallet className="w-5 h-5" />,
        description: 'Pay when you receive your order',
        color: 'text-emerald-700',
        tint: 'bg-emerald-50 text-emerald-600',
      },
      card: {
        label: 'Credit / Debit Card',
        icon: <CreditCard className="w-5 h-5" />,
        description: 'Paid online via card',
        color: 'text-blue-700',
        tint: 'bg-blue-50 text-blue-600',
      },
      bkash: {
        label: 'bKash',
        icon: <Smartphone className="w-5 h-5" />,
        description: 'Paid via bKash mobile banking',
        color: 'text-pink-700',
        tint: 'bg-pink-50 text-pink-600',
      },
    };
    const defaultMethod = {
      label: method || 'Cash on Delivery',
      icon: <Wallet className="w-5 h-5" />,
      description: 'Pay when you receive your order',
      color: 'text-emerald-700',
      tint: 'bg-emerald-50 text-emerald-600',
    };
    return methods[method] || defaultMethod;
  };

  const canCancelOrder = () => {
    if (!order) return false;
    if (order.status !== 'pending') return false;
    const orderTime = new Date(order.placedAt).getTime();
    const currentTime = new Date().getTime();
    const minutesPassed = (currentTime - orderTime) / (1000 * 60);
    return minutesPassed <= 5;
  };

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      await api.delete(`/orders/${id}`);
      toast.success('Order cancelled successfully');
      setShowCancelModal(false);
      await fetchOrderDetails();
      router.push('/orders');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to cancel order');
    } finally {
      setCancelling(false);
    }
  };

  const deliveryFee = 50;
  const platformFee = 20;
  const total = subtotal + deliveryFee + platformFee;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 space-y-6 animate-pulse">
          <div className="h-5 w-16 bg-gray-200 rounded" />
          <div className="h-48 bg-gray-100 rounded-2xl border border-gray-100" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-32 bg-gray-100 rounded-2xl border border-gray-100" />
              <div className="h-64 bg-gray-100 rounded-2xl border border-gray-100" />
            </div>
            <div className="space-y-6">
              <div className="h-40 bg-gray-100 rounded-2xl border border-gray-100" />
              <div className="h-28 bg-gray-100 rounded-2xl border border-gray-100" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Order not found</h2>
          <p className="text-sm text-gray-500 mb-4">The order you're looking for doesn't exist.</p>
          <Link href="/orders" className="text-sm font-medium text-orange-600 hover:text-orange-700">
            View all orders →
          </Link>
        </div>
      </div>
    );
  }

  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';
  const cancelable = canCancelOrder();
  const statusMeta = getStatusMeta(order.status);
  const paymentInfo = getPaymentMethodDisplay(order.paymentMethod || 'cash');

  // 6 steps for tracking
  const trackingSteps = [
    { key: 'pending', label: 'Order Placed' },
    { key: 'preparing', label: 'Preparing' },
    { key: 'ready', label: 'Ready' },
    { key: 'picked_up', label: 'Pick Up' },
    { key: 'on_the_way', label: 'On the Way' },
    { key: 'delivered', label: 'Delivered' },
  ];

  const currentStepIndex = trackingSteps.findIndex((step) => step.key === order.status);
  const currentStep = currentStepIndex + 1;

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-orange-600 transition mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {/* Order Header Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden mb-6">
            <div className="p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${statusMeta.color} ${statusMeta.ring}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                      {statusMeta.text}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${paymentInfo.tint}`}
                    >
                      {paymentInfo.label}
                    </span>
                    {!isCancelled && !isDelivered && (
                      <span className="flex items-center gap-1 text-gray-400 text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        Est. {getEstimatedTime()}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">Order #{order.id?.slice(-8).toUpperCase() || 'N/A'}</h1>
                  <p className="text-gray-400 text-sm mt-1">
                    {new Date(order.placedAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-gray-400 text-xs">Total Amount</p>
                  <p className="text-3xl font-bold text-orange-600 tabular-nums">৳{order.totalAmount || total}</p>
                  <p className="text-gray-400 text-xs mt-1">Incl. all fees & tax</p>
                </div>
              </div>
            </div>

            {/* Cancel Button Section - opens the modal */}
            {cancelable && timeRemaining && (
              <div className="px-6 py-4 bg-red-50 border-t border-red-100">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Cancel within {timeRemaining.minutes}:{String(timeRemaining.seconds).padStart(2, '0')}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition shadow-sm shadow-red-200"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancel Order
                  </button>
                </div>
                <p className="text-xs text-red-500 mt-2">
                  Orders can only be cancelled within 5 minutes of placement, before the restaurant starts preparing your food.
                </p>
              </div>
            )}

            {/* 6-Step Tracking Progress Bar */}
            {!isCancelled && (
              <div className="p-6 border-t border-gray-100">
                {/* Step Labels */}
                <div className="flex justify-between mb-3">
                  {trackingSteps.map((step, index) => (
                    <div key={step.key} className="text-center flex-1">
                      <div className={`text-[10px] font-medium ${index + 1 <= currentStep ? 'text-orange-500' : 'text-gray-300'}`}>
                        {step.label}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress Bar */}
                <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${trackingProgress}%` }}
                  />
                </div>

                {/* Step Indicators */}
                <div className="flex justify-between mt-3">
                  {trackingSteps.map((step, index) => (
                    <div key={step.key} className="text-center flex-1">
                      <div
                        className={`w-2 h-2 rounded-full mx-auto transition-all duration-300 ${
                          index + 1 <= currentStep ? 'bg-orange-500 scale-125' : 'bg-gray-200'
                        }`}
                      />
                    </div>
                  ))}
                </div>

                {order.status === 'delivered' && (
                  <div className="mt-4 flex items-center gap-2 text-emerald-600 text-sm justify-center">
                    <CheckCircle className="w-4 h-4" />
                    Delivered successfully on {order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : 'N/A'}
                  </div>
                )}
                {order.status === 'on_the_way' && (
                  <div className="mt-4 flex items-center gap-2 text-orange-600 text-sm justify-center animate-pulse">
                    <Navigation className="w-4 h-4" />
                    Your order is on the way! Estimated arrival in 10-15 minutes.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Order Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Restaurant Info */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Home className="w-4 h-4 text-orange-500" />
                    Restaurant Details
                  </h2>
                </div>
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-orange-50 text-2xl shrink-0">
                      🍽️
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900">{order.restaurant?.name}</h3>
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1.5">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-gray-300" />
                        <span className="truncate">{order.restaurant?.address}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                        <Phone className="w-3.5 h-3.5 shrink-0 text-gray-300" />
                        <span>{order.restaurant?.phone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-orange-500" />
                    Order Items
                  </h2>
                </div>
                <div className="p-5">
                  <div className="space-y-4">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex justify-between items-center">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-800 truncate">{item.menuItem?.name}</p>
                          <p className="text-xs text-gray-400">Qty: {item.quantity}</p>
                        </div>
                        <p className="font-semibold text-sm text-gray-800 tabular-nums">
                          ৳{(item.unitPrice * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Price Breakdown */}
                  <div className="border-t border-gray-100 mt-6 pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="text-gray-800 tabular-nums">৳{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Delivery Fee</span>
                        <span className="text-gray-800 tabular-nums">৳{deliveryFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Platform Fee</span>
                        <span className="text-gray-800 tabular-nums">৳{platformFee.toFixed(2)}</span>
                      </div>
                      <div className="border-t border-gray-100 pt-2 mt-2">
                        <div className="flex justify-between font-bold">
                          <span className="text-gray-900">Total</span>
                          <span className="text-orange-600 text-lg tabular-nums">৳{order.totalAmount || total}</span>
                        </div>
                        <p className="text-xs text-gray-400 text-right mt-1">Including all fees & taxes</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Delivery Info & Payment */}
            <div className="space-y-6">
              {/* Delivery Address */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-orange-500" />
                    Delivery Address
                  </h2>
                </div>
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 text-orange-600 shrink-0">
                      <Home className="w-4.5 h-4.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-800 font-medium text-sm">{order.deliveryAddress}</p>
                      {order.deliveryInstructions && (
                        <p className="text-xs text-gray-500 mt-2">Instructions: {order.deliveryInstructions}</p>
                      )}
                      {(order.customerName || order.customerPhone) && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-400">Contact Person</p>
                          <p className="text-sm font-medium text-gray-700">{order.customerName}</p>
                          <p className="text-sm text-gray-500">{order.customerPhone}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-orange-500" />
                    Payment Method
                  </h2>
                </div>
                <div className="p-5">
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${paymentInfo.tint}`}>
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/60 shrink-0">
                      {paymentInfo.icon}
                    </span>
                    <div>
                      <p className={`font-medium text-sm ${paymentInfo.color}`}>{paymentInfo.label}</p>
                      <p className="text-xs text-gray-500">{paymentInfo.description}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Need Help? */}
              <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
                <h3 className="font-semibold text-sm text-gray-800 mb-1.5">Need help with your order?</h3>
                <p className="text-xs text-gray-500 mb-3">Contact our support team for assistance</p>
                <button className="w-full bg-orange-500 text-white py-2 rounded-xl text-sm font-medium hover:bg-orange-600 transition">
                  Contact Support
                </button>
              </div>

              {/* Reorder Button */}
              {isDelivered && (
                <button className="w-full bg-white border border-orange-200 text-orange-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-orange-50 transition">
                  Order Again
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      <CancelOrderModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelOrder}
        orderId={order.id}
        orderTotal={order.totalAmount || total}
        restaurantName={order.restaurant?.name}
        paymentMethod={order.paymentMethod || 'cash'}
        timeRemaining={timeRemaining}
        loading={cancelling}
      />
    </>
  );
}