'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Order } from '@/types';
import { unwrapPaginated } from '@/lib/unwrapPaginated';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import toast from 'react-hot-toast';
import {
  MapPin,
  Package,
  Store,
  Navigation,
  ExternalLink,
  Volume2,
  VolumeX,
  RefreshCw,
  Clock,
  CheckCircle2,
  Bike,
  ArrowRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { wsService } from '@/lib/websocket';
import { playDeliveryAlertSound } from '@/lib/sound';

export default function AgentAvailablePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const soundRef = useRef(soundEnabled);
  soundRef.current = soundEnabled;

  const fetchAvailable = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const currentUser = auth.getCurrentUser();
      if (!currentUser?.id) return;

      const res = await api.get('/orders/available');
      const items = unwrapPaginated(res.data).items as Order[];
      setOrders(items);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      if (isManual) toast.error('Failed to refresh orders');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchAvailable();

    wsService.connect();

    const handleNotification = (payload: any) => {
      const type = payload?.type;
      if (
        type === 'order_available' ||
        type === 'order_ready' ||
        payload?.title?.toLowerCase().includes('available') ||
        payload?.title?.toLowerCase().includes('ready')
      ) {
        if (soundRef.current) {
          playDeliveryAlertSound();
        }
        toast.success(
          payload?.message || '🚴 New delivery offer ready for pickup!',
          { duration: 5000 },
        );
        void fetchAvailable();
      }
    };

    const handleStatusUpdate = () => {
      void fetchAvailable();
    };

    wsService.on('notification', handleNotification);
    wsService.on('order-status-update', handleStatusUpdate);

    // Auto-refresh poll every 12 seconds when online
    const interval = setInterval(() => {
      if (isOnline) {
        void fetchAvailable();
      }
    }, 12000);

    return () => {
      clearInterval(interval);
      wsService.off('notification', handleNotification);
      wsService.off('order-status-update', handleStatusUpdate);
    };
  }, [fetchAvailable, isOnline]);

  async function acceptOrder(orderId: string) {
    try {
      setAcceptingId(orderId);
      await api.patch(`/orders/${orderId}/accept`);
      toast.success('Order accepted! Redirecting to your active delivery...');
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      setTimeout(() => {
        router.push('/agent/deliveries');
      }, 1000);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to accept order');
      setAcceptingId(null);
    }
  }

  const getGoogleMapsUrl = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address,
    )}`;
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-xl">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Available Delivery Offers
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Claim ready orders nearby and start earning delivery fees
            </p>
          </div>
        </div>

        {/* Controls: Online switch, Sound alert, and Refresh */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Duty Status Switch */}
          <button
            type="button"
            onClick={() => {
              setIsOnline(!isOnline);
              toast.success(
                !isOnline ? 'You are now Online & On Duty' : 'You went Offline',
              );
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-gray-100 text-gray-600 border-gray-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
              }`}
            />
            <span>{isOnline ? 'On Duty' : 'Off Duty'}</span>
          </button>

          {/* Sound alert toggle */}
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              toast.success(
                !soundEnabled
                  ? 'Delivery alert sounds enabled'
                  : 'Delivery alert sounds muted',
              );
            }}
            title={soundEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
            className={`p-2 rounded-xl border text-xs font-medium transition ${
              soundEnabled
                ? 'bg-orange-50 text-orange-600 border-orange-200'
                : 'bg-gray-100 text-gray-400 border-gray-200'
            }`}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={() => fetchAvailable(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>

          <Link
            href="/agent/deliveries"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-black transition shadow-xs"
          >
            <span>My Deliveries</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Auto-refresh Status Subheader */}
      <div className="flex items-center justify-between text-xs text-gray-400 px-1">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Updated: {lastUpdated.toLocaleTimeString()}
        </span>
        <span className="text-gray-500 font-medium">
          {orders.length} order{orders.length === 1 ? '' : 's'} available
        </span>
      </div>

      {/* Orders List */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-orange-50 text-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-base font-bold text-gray-900">
            No delivery orders available right now
          </h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
            Keep your app open and stay online. You will receive an instant sound
            alert as soon as a restaurant marks an order ready for pickup.
          </p>
          <button
            onClick={() => fetchAvailable(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-xs font-semibold hover:bg-orange-600 transition shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Check Again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {orders.map((order: any) => {
            const deliveryFee = Number(order.deliveryFee || 50);
            const orderTotal = Number(order.totalAmount || order.total || 0);
            const itemsCount =
              order.items?.reduce(
                (sum: number, it: any) => sum + (it.quantity || 1),
                0,
              ) || order.items?.length || 0;
            const isReady = order.status === 'ready';

            return (
              <div
                key={order.id}
                className="bg-white border border-gray-200/80 hover:border-orange-300 rounded-2xl p-5 shadow-sm transition hover:shadow-md flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left: Route details (Pickup Restaurant -> Dropoff Customer) */}
                <div className="space-y-3.5 flex-1">
                  {/* Status & Earnings Header */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1">
                      <span>৳{deliveryFee}</span>
                      <span className="font-normal text-[11px] text-emerald-600">
                        Courier Fee
                      </span>
                    </span>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        isReady
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {isReady ? '✓ Ready for Pickup' : '⏳ Kitchen Preparing'}
                    </span>

                    <span className="text-xs text-gray-400 font-mono">
                      #{order.id?.slice(0, 8).toUpperCase()}
                    </span>
                  </div>

                  {/* Route Timeline */}
                  <div className="space-y-2.5 border-l-2 border-orange-200 pl-3 ml-1.5">
                    {/* Pickup Restaurant */}
                    <div className="relative">
                      <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-orange-500 ring-4 ring-white" />
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <Store className="w-3.5 h-3.5 text-orange-500" />
                            Pickup:
                          </p>
                          <p className="text-sm font-bold text-gray-900">
                            {order.restaurant?.name || 'Restaurant Outlet'}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {order.restaurant?.address || 'Restaurant Address'}
                          </p>
                        </div>
                        {order.restaurant?.address && (
                          <a
                            href={getGoogleMapsUrl(order.restaurant.address)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg font-medium transition"
                          >
                            <Navigation className="w-3 h-3" />
                            Maps
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Dropoff Customer */}
                    <div className="relative pt-1">
                      <div className="absolute -left-[19px] top-2 w-2.5 h-2.5 rounded-full bg-gray-900 ring-4 ring-white" />
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-700" />
                            Dropoff:
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {order.deliveryAddress || 'Customer Address'}
                          </p>
                          {order.deliveryInstructions && (
                            <p className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded mt-1 inline-block">
                              Note: {order.deliveryInstructions}
                            </p>
                          )}
                        </div>
                        {order.deliveryAddress && (
                          <a
                            href={getGoogleMapsUrl(order.deliveryAddress)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition"
                          >
                            <Navigation className="w-3 h-3" />
                            Maps
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Summary Bar */}
                  <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                    {itemsCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Package className="w-3.5 h-3.5 text-gray-400" />
                        {itemsCount} item{itemsCount > 1 ? 's' : ''} to deliver
                      </span>
                    )}
                    <span>•</span>
                    <span>Order Value: ৳{orderTotal.toLocaleString()}</span>
                  </div>
                </div>

                {/* Right: Accept Button */}
                <div className="flex md:flex-col items-center justify-end gap-2 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-5">
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-400">Your Pay</p>
                    <p className="text-lg font-black text-emerald-600">
                      ৳{deliveryFee}
                    </p>
                  </div>

                  <button
                    onClick={() => acceptOrder(order.id)}
                    disabled={acceptingId === order.id}
                    className="w-full md:w-auto px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {acceptingId === order.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Accepting...</span>
                      </>
                    ) : (
                      <>
                        <Bike className="w-4 h-4" />
                        <span>Accept Delivery</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}