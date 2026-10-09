'use client';

import { useEffect, useState, useCallback } from 'react';
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
  Phone,
  Navigation,
  CheckCircle2,
  Clock,
  Bike,
  Check,
  AlertCircle,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { wsService } from '@/lib/websocket';

const NEXT_STATUS: Record<string, string> = {
  assigned: 'picked_up',
  ready: 'picked_up',
  picked_up: 'on_the_way',
  on_the_way: 'delivered',
};

const STATUS_LABELS: Record<string, { label: string; step: number; color: string }> = {
  assigned: { label: 'Assigned to You', step: 1, color: 'bg-amber-100 text-amber-800' },
  ready: { label: 'Ready for Pickup', step: 1, color: 'bg-blue-100 text-blue-800' },
  picked_up: { label: 'Picked Up from Restaurant', step: 2, color: 'bg-purple-100 text-purple-800' },
  on_the_way: { label: 'On the Way to Customer', step: 3, color: 'bg-orange-100 text-orange-800' },
  delivered: { label: 'Delivered', step: 4, color: 'bg-emerald-100 text-emerald-800' },
};

export default function AgentDeliveriesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [confirmDeliveryOrder, setConfirmDeliveryOrder] = useState<Order | null>(null);
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const fetchMyDeliveries = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const currentUser = auth.getCurrentUser();
      if (!currentUser?.id) return;

      const agentId = currentUser.id;
      const res = await api.get('/orders/agent/my');
      const all = unwrapPaginated(res.data).items;

      const mine = all.filter(
        (o: any) => o.agentId === agentId || o.agent?.id === agentId,
      );

      setOrders(
        mine.sort(
          (a: any, b: any) =>
            new Date(b.updatedAt || b.placedAt).getTime() -
            new Date(a.updatedAt || a.placedAt).getTime(),
        ) as Order[],
      );
    } catch (err) {
      console.error(err);
      if (isManual) toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchMyDeliveries();

    wsService.connect();
    const handleUpdate = () => {
      void fetchMyDeliveries();
    };

    wsService.on('notification', handleUpdate);
    wsService.on('order-status-update', handleUpdate);

    // Auto-poll active deliveries every 15s
    const timer = setInterval(() => {
      void fetchMyDeliveries();
    }, 15000);

    return () => {
      clearInterval(timer);
      wsService.off('notification', handleUpdate);
      wsService.off('order-status-update', handleUpdate);
    };
  }, [fetchMyDeliveries]);

  // Update delivery status using the correct agent delivery endpoint
  async function updateStatus(orderId: string, targetStatus: string) {
    try {
      setUpdatingId(orderId);
      // ✅ Critical fix: Agent uses /orders/:id/delivery
      await api.patch(`/orders/${orderId}/delivery`, { status: targetStatus });

      toast.success(
        targetStatus === 'delivered'
          ? '🎉 Delivery successfully completed!'
          : `Status updated to ${targetStatus.replace(/_/g, ' ')}`,
      );

      setConfirmDeliveryOrder(null);
      await fetchMyDeliveries();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          'Failed to update delivery status. Please retry.',
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const activeOrders = orders.filter((o) => o.status !== 'delivered' && o.status !== 'cancelled');
  const completedOrders = orders.filter((o) => o.status === 'delivered');

  const totalEarned = completedOrders.reduce(
    (sum, o) => sum + Number(o.deliveryFee || 50),
    0,
  );

  const getGoogleMapsUrl = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      address,
    )}`;
  };

  const toggleItemsExpand = (orderId: string) => {
    setExpandedItems((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Header & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Courier Deliveries</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage your active delivery runs, customer navigation, and earnings
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchMyDeliveries(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span>Refresh</span>
          </button>

          <Link
            href="/agent/available"
            className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Find Deliveries</span>
          </Link>
        </div>
      </div>

      {/* Courier Stats Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-400 font-medium">Active Deliveries</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            {activeOrders.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
          <p className="text-xs text-gray-400 font-medium">Completed Deliveries</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">
            {completedOrders.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs col-span-2 sm:col-span-1">
          <p className="text-xs text-gray-400 font-medium">Courier Earnings</p>
          <p className="text-xl font-bold text-gray-900 mt-1">
            ৳{totalEarned.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'active'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>Active Runs</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'active'
                ? 'bg-orange-100 text-orange-700 font-bold'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {activeOrders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('completed')}
          className={`pb-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
            activeTab === 'completed'
              ? 'border-orange-500 text-orange-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>Completed History</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === 'completed'
                ? 'bg-orange-100 text-orange-700 font-bold'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {completedOrders.length}
          </span>
        </button>
      </div>

      {/* ACTIVE DELIVERIES TAB */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          {activeOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center shadow-sm">
              <Bike className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-bold text-gray-900">
                No active deliveries assigned
              </h3>
              <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-5">
                Check the Available Deliveries board to claim ready orders and
                earn fees.
              </p>
              <Link
                href="/agent/available"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl text-xs font-bold hover:bg-orange-600 transition shadow-xs"
              >
                <Bike className="w-4 h-4" />
                Browse Available Deliveries
              </Link>
            </div>
          ) : (
            activeOrders.map((order: any) => {
              const nextStatus = NEXT_STATUS[order.status];
              const deliveryFee = Number(order.deliveryFee || 50);
              const statusMeta = STATUS_LABELS[order.status] || {
                label: order.status,
                step: 1,
                color: 'bg-gray-100 text-gray-800',
              };

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden"
                >
                  {/* Card Header */}
                  <div className="p-4 sm:p-5 bg-gray-50/70 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-sm text-gray-900">
                        #{order.id?.slice(0, 8).toUpperCase()}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${statusMeta.color}`}
                      >
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold px-2.5 py-1 rounded-lg">
                        ৳{deliveryFee} Courier Pay
                      </span>
                    </div>
                  </div>

                  {/* Stepper Progress Bar */}
                  <div className="px-5 py-3 bg-white border-b border-gray-100">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-gray-500">
                      <span
                        className={
                          statusMeta.step >= 1 ? 'text-orange-600 font-bold' : ''
                        }
                      >
                        1. Accepted
                      </span>
                      <span
                        className={
                          statusMeta.step >= 2 ? 'text-orange-600 font-bold' : ''
                        }
                      >
                        2. Picked Up
                      </span>
                      <span
                        className={
                          statusMeta.step >= 3 ? 'text-orange-600 font-bold' : ''
                        }
                      >
                        3. On Route
                      </span>
                      <span
                        className={
                          statusMeta.step >= 4 ? 'text-orange-600 font-bold' : ''
                        }
                      >
                        4. Delivered
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div
                        className="bg-orange-500 h-full transition-all duration-300"
                        style={{
                          width: `${(statusMeta.step / 4) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Card Body: Route Cards */}
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 1. Pickup Restaurant Box */}
                      <div className="p-4 rounded-xl border border-orange-100 bg-orange-50/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
                            <Store className="w-4 h-4 text-orange-500" />
                            Pickup Restaurant
                          </span>
                          {order.restaurant?.phone && (
                            <a
                              href={`tel:${order.restaurant.phone}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700 hover:text-orange-600 bg-white border border-gray-200 px-2 py-1 rounded-lg transition"
                            >
                              <Phone className="w-3 h-3 text-orange-500" />
                              Call
                            </a>
                          )}
                        </div>

                        <p className="font-bold text-sm text-gray-900">
                          {order.restaurant?.name || 'Restaurant Outlet'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {order.restaurant?.address || 'Address not listed'}
                        </p>

                        {order.restaurant?.address && (
                          <div className="pt-1">
                            <a
                              href={getGoogleMapsUrl(order.restaurant.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-500 text-white rounded-lg text-xs font-semibold hover:bg-orange-600 transition shadow-xs"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              Navigate to Restaurant
                            </a>
                          </div>
                        )}
                      </div>

                      {/* 2. Dropoff Customer Box */}
                      <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-gray-700" />
                            Customer Destination
                          </span>
                          {(order.customerPhone || order.customer?.phone) && (
                            <a
                              href={`tel:${
                                order.customerPhone || order.customer?.phone
                              }`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700 hover:text-orange-600 bg-white border border-gray-200 px-2 py-1 rounded-lg transition"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              Call Customer
                            </a>
                          )}
                        </div>

                        <p className="font-bold text-sm text-gray-900">
                          {order.customerName ||
                            order.customer?.fullName ||
                            'Customer'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {order.deliveryAddress || 'Address not specified'}
                        </p>

                        {order.deliveryInstructions && (
                          <p className="text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
                            <strong>Note:</strong> {order.deliveryInstructions}
                          </p>
                        )}

                        {order.deliveryAddress && (
                          <div className="pt-1">
                            <a
                              href={getGoogleMapsUrl(order.deliveryAddress)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-black transition shadow-xs"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              Navigate to Customer
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Items Bag Checklist Toggle */}
                    {order.items && order.items.length > 0 && (
                      <div className="border border-gray-100 rounded-xl overflow-hidden bg-white">
                        <button
                          type="button"
                          onClick={() => toggleItemsExpand(order.id)}
                          className="w-full flex items-center justify-between p-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                        >
                          <span className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-orange-500" />
                            <span>
                              Order Item Checklist ({order.items.length} items)
                            </span>
                          </span>
                          {expandedItems[order.id] ? (
                            <ChevronUp className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          )}
                        </button>

                        {expandedItems[order.id] && (
                          <div className="p-3 border-t border-gray-100 bg-gray-50/50 space-y-1.5 text-xs">
                            {order.items.map((it: any, idx: number) => (
                              <div
                                key={it.id || idx}
                                className="flex items-center justify-between text-gray-700 py-1 border-b border-gray-100 last:border-0"
                              >
                                <span className="flex items-center gap-2">
                                  <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-800 font-bold flex items-center justify-center text-[10px]">
                                    {it.quantity}x
                                  </span>
                                  <span>{it.menuItem?.name || it.name || 'Dish'}</span>
                                </span>
                                <span className="text-gray-400">
                                  ৳{(it.unitPrice || it.price || 0) * it.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Step Button */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100">
                      <span className="text-xs text-gray-500">
                        Total Order Amount:{' '}
                        <strong className="text-gray-900">
                          ৳
                          {Number(
                            order.totalAmount || order.total || 0,
                          ).toLocaleString()}
                        </strong>
                      </span>

                      {nextStatus && (
                        <div className="w-full sm:w-auto">
                          {nextStatus === 'delivered' ? (
                            <button
                              onClick={() => setConfirmDeliveryOrder(order)}
                              disabled={updatingId === order.id}
                              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Complete Delivery</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => updateStatus(order.id, nextStatus)}
                              disabled={updatingId === order.id}
                              className="w-full sm:w-auto px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              {updatingId === order.id ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Updating...</span>
                                </>
                              ) : nextStatus === 'picked_up' ? (
                                <>
                                  <Package className="w-4 h-4" />
                                  <span>Confirm Pickup from Restaurant</span>
                                </>
                              ) : (
                                <>
                                  <Bike className="w-4 h-4" />
                                  <span>Start Ride (On the Way)</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* COMPLETED DELIVERIES TAB */}
      {activeTab === 'completed' && (
        <div className="space-y-4">
          {completedOrders.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-16 text-center text-gray-500 shadow-sm">
              <CheckCircle2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="font-semibold text-gray-800">
                No completed deliveries yet
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Completed runs and collected courier fees will appear here.
              </p>
            </div>
          ) : (
            completedOrders.map((order: any) => {
              const deliveryFee = Number(order.deliveryFee || 50);
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-gray-900">
                        #{order.id?.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                        Delivered
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-800">
                      {order.restaurant?.name || 'Restaurant'} ➔{' '}
                      {order.deliveryAddress || 'Customer'}
                    </p>
                    <p className="text-xs text-gray-400">
                      Completed:{' '}
                      {order.updatedAt
                        ? new Date(order.updatedAt).toLocaleString()
                        : '—'}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-400 block">
                      Fee Earned
                    </span>
                    <span className="text-base font-bold text-emerald-600">
                      +৳{deliveryFee}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Complete Delivery Confirmation Modal */}
      {confirmDeliveryOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-bold text-gray-900">
                Confirm Delivery Completion
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Have you handed the order #{confirmDeliveryOrder.id?.slice(0, 8).toUpperCase()} to the customer at:
              </p>
              <p className="text-sm font-semibold text-gray-800 mt-2 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                {confirmDeliveryOrder.deliveryAddress}
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeliveryOrder(null)}
                disabled={updatingId === confirmDeliveryOrder.id}
                className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-xl text-xs hover:bg-gray-50 transition"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={() => updateStatus(confirmDeliveryOrder.id, 'delivered')}
                disabled={updatingId === confirmDeliveryOrder.id}
                className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition flex items-center justify-center gap-2"
              >
                {updatingId === confirmDeliveryOrder.id ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <span>Yes, Delivered</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}