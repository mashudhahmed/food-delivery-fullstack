'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Order } from '@/app/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { 
  ChevronLeft, 
  MapPin, 
  Phone, 
  Clock, 
  Package, 
  CreditCard,
  Home,
  Calendar,
  Truck,
  CheckCircle,
  AlertCircle,
  ShoppingBag,
  Navigation
} from 'lucide-react';

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackingProgress, setTrackingProgress] = useState(0);
  const [subtotal, setSubtotal] = useState(0);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/orders/${id}`);
      const orderData = response.data;
      setOrder(orderData);
      calculateTrackingProgress(orderData.status);
      
      const calculatedSubtotal = orderData.items?.reduce(
        (sum: number, item: any) => sum + (item.unitPrice * item.quantity), 
        0
      ) || 0;
      setSubtotal(calculatedSubtotal);
    } catch (error) {
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: 6-step progress mapping
  const calculateTrackingProgress = (status: string) => {
    const progressMap: Record<string, number> = {
      'pending': 16,
      'preparing': 33,
      'ready': 50,
      'picked_up': 66,
      'on_the_way': 83,
      'delivered': 100,
      'cancelled': 0,
    };
    setTrackingProgress(progressMap[status] || 0);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      preparing: 'bg-blue-500',
      ready: 'bg-purple-500',
      picked_up: 'bg-indigo-500',
      on_the_way: 'bg-orange-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  const getStatusText = (status: string) => {
    const texts: Record<string, string> = {
      pending: 'Order Placed',
      preparing: 'Being Prepared',
      ready: 'Ready for Pickup',
      picked_up: 'Picked Up',
      on_the_way: 'On the Way',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
    };
    return texts[status] || status.replace('_', ' ');
  };

  const getEstimatedTime = () => {
    if (order?.status === 'delivered') return 'Delivered';
    if (order?.status === 'cancelled') return 'Cancelled';
    return '30-45 minutes';
  };

  const deliveryFee = 50;
  const platformFee = 20;
  const total = subtotal + deliveryFee + platformFee;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Order not found</h2>
          <p className="text-gray-500 mb-4">The order you're looking for doesn't exist.</p>
          <Link href="/orders" className="text-orange-500 hover:underline">
            View all orders →
          </Link>
        </div>
      </div>
    );
  }

  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';

  // ✅ UPDATED: 6 steps for tracking
  const trackingSteps = [
    { key: 'pending', label: 'Order Placed', icon: <Package className="w-4 h-4" /> },
    { key: 'preparing', label: 'Preparing', icon: <Clock className="w-4 h-4" /> },
    { key: 'ready', label: 'Ready', icon: <CheckCircle className="w-4 h-4" /> },
    { key: 'picked_up', label: 'Pick Up', icon: <Truck className="w-4 h-4" /> },
    { key: 'on_the_way', label: 'On the Way', icon: <Navigation className="w-4 h-4" /> },
    { key: 'delivered', label: 'Delivered', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  const currentStepIndex = trackingSteps.findIndex(step => step.key === order.status);
  const currentStep = currentStepIndex + 1;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        {/* Order Header Card */}
        <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6`}>
          <div className={`p-6 ${isCancelled ? 'bg-red-50' : 'bg-linear-to-r from-orange-500 to-orange-600'}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    isCancelled 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-white/20 text-white'
                  }`}>
                    {getStatusText(order.status).toUpperCase()}
                  </span>
                  {!isCancelled && !isDelivered && (
                    <span className="flex items-center gap-1 text-white/80 text-sm">
                      <Clock className="w-4 h-4" />
                      Est. {getEstimatedTime()}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-white">
                  Order #{order.id.slice(-8).toUpperCase()}
                </h1>
                <p className="text-white/80 text-sm mt-1">
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
              <div className="text-right">
                <p className="text-white/80 text-sm">Total Amount</p>
                <p className="text-3xl font-bold text-white">৳{total}</p>
                <p className="text-white/60 text-xs mt-1">Incl. all fees & tax</p>
              </div>
            </div>
          </div>

          {/* ✅ UPDATED: 6-Step Tracking Progress Bar */}
          {!isCancelled && (
            <div className="p-6 border-b border-gray-100">
              {/* Step Labels */}
              <div className="flex justify-between mb-3">
                {trackingSteps.map((step, index) => (
                  <div key={step.key} className="text-center flex-1">
                    <div className={`text-[10px] font-medium ${
                      index + 1 <= currentStep ? 'text-orange-500' : 'text-gray-400'
                    }`}>
                      {step.label}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Progress Bar */}
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${trackingProgress}%` }}
                />
              </div>
              
              {/* Step Icons */}
              <div className="flex justify-between mt-2">
                {trackingSteps.map((step, index) => (
                  <div key={step.key} className="text-center flex-1">
                    <div className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                      index + 1 < currentStep
                        ? 'bg-green-500 text-white'
                        : index + 1 === currentStep
                        ? 'bg-orange-500 text-white animate-pulse'
                        : 'bg-gray-200 text-gray-400'
                    }`}>
                      {index + 1 < currentStep ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          index + 1 === currentStep ? 'bg-white' : 'bg-gray-400'
                        }`} />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {order.status === 'delivered' && (
                <div className="mt-4 flex items-center gap-2 text-green-600 text-sm justify-center">
                  <CheckCircle className="w-4 h-4" />
                  Delivered successfully on {new Date(order.updatedAt).toLocaleDateString()}
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Home className="w-5 h-5 text-orange-500" />
                  Restaurant Details
                </h2>
              </div>
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-orange-100 rounded-xl flex items-center justify-center">
                    <span className="text-2xl">🍽️</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-lg">{order.restaurant?.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <MapPin className="w-4 h-4" />
                      <span>{order.restaurant?.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Phone className="w-4 h-4" />
                      <span>{order.restaurant?.phone}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-orange-500" />
                  Order Items
                </h2>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">{item.menuItem?.name}</p>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-semibold text-gray-800">৳{(item.unitPrice * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className="border-t border-gray-100 mt-6 pt-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-800">৳{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Delivery Fee</span>
                      <span className="text-gray-800">৳{deliveryFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Platform Fee</span>
                      <span className="text-gray-800">৳{platformFee.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-gray-100 pt-2 mt-2">
                      <div className="flex justify-between font-bold">
                        <span className="text-gray-900">Total</span>
                        <span className="text-orange-600 text-lg">৳{total.toFixed(2)}</span>
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  Delivery Address
                </h2>
              </div>
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                    <Home className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-800 font-medium">{order.deliveryAddress}</p>
                    {order.deliveryInstructions && (
                      <p className="text-sm text-gray-500 mt-2 flex items-start gap-1">
                        <span>📝</span>
                        <span>Instructions: {order.deliveryInstructions}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-orange-500" />
                  Payment Method
                </h2>
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">💵</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Cash on Delivery</p>
                    <p className="text-sm text-gray-500">Pay when you receive your order</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Need Help? */}
            <div className="bg-orange-50 rounded-2xl p-5 border border-orange-100">
              <h3 className="font-semibold text-gray-800 mb-2">Need help with your order?</h3>
              <p className="text-sm text-gray-600 mb-3">Contact our support team for assistance</p>
              <button className="w-full bg-orange-500 text-white py-2 rounded-lg font-medium hover:bg-orange-600 transition">
                Contact Support
              </button>
            </div>

            {/* Reorder Button */}
            {isDelivered && (
              <button className="w-full bg-white border-2 border-orange-500 text-orange-600 py-3 rounded-xl font-semibold hover:bg-orange-50 transition">
                Order Again
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}