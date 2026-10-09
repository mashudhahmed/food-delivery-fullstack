'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Order } from '@/types';
import { unwrapPaginated } from '@/lib/unwrapPaginated';
import { StatCard } from '@/components/StatCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import toast from 'react-hot-toast';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  Bike,
  DollarSign,
  ArrowRight,
  Navigation,
  RefreshCw,
  AlertCircle,
  Phone,
  Calendar,
  ChevronRight,
  Store,
  MapPin,
} from 'lucide-react';
import Link from 'next/link';
import { wsService } from '@/lib/websocket';

export default function AgentDashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({
    available: 0,
    active: 0,
    deliveredToday: 0,
    totalDelivered: 0,
    todayEarnings: 0,
    totalEarnings: 0,
  });
  const [activeDelivery, setActiveDelivery] = useState<Order | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const fetchDashboard = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const currentUser = auth.getCurrentUser();
      if (!currentUser?.id) return;
      setUser(currentUser);

      const agentId = currentUser.id;

      const [availableRes, myOrdersRes] = await Promise.all([
        api.get('/orders/available'),
        api.get('/orders/agent/my'),
      ]);

      const available = unwrapPaginated(availableRes.data).items;
      const myOrders = unwrapPaginated(myOrdersRes.data).items;

      // Active runs in progress
      const active = myOrders.filter(
        (o: any) =>
          (o.agentId === agentId || o.agent?.id === agentId) &&
          ['assigned', 'ready', 'picked_up', 'on_the_way'].includes(o.status),
      );

      // Current urgent delivery to show on hero card
      if (active.length > 0) {
        // prioritize on_the_way -> picked_up -> ready
        const prioritized = [...active].sort((a: any, b: any) => {
          const rank: Record<string, number> = {
            on_the_way: 3,
            picked_up: 2,
            ready: 1,
            assigned: 0,
          };
          return (rank[b.status] || 0) - (rank[a.status] || 0);
        });
        setActiveDelivery(prioritized[0] as Order);
      } else {
        setActiveDelivery(null);
      }

      // Delivered orders
      const allDelivered = myOrders.filter(
        (o: any) =>
          (o.agentId === agentId || o.agent?.id === agentId) &&
          o.status === 'delivered',
      );

      // Today's delivered orders
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayDelivered = allDelivered.filter((o: any) => {
        const orderDate = new Date(o.updatedAt || o.placedAt);
        return orderDate >= today;
      });

      const todayEarnings = todayDelivered.reduce(
        (sum: number, o: any) => sum + (Number(o.deliveryFee) || 50),
        0,
      );

      const totalEarnings = allDelivered.reduce(
        (sum: number, o: any) => sum + (Number(o.deliveryFee) || 50),
        0,
      );

      setStats({
        available: available.length,
        active: active.length,
        deliveredToday: todayDelivered.length,
        totalDelivered: allDelivered.length,
        todayEarnings,
        totalEarnings,
      });

      setRecentOrders(
        [...myOrders]
          .sort(
            (a: any, b: any) =>
              new Date(b.updatedAt || b.placedAt).getTime() -
              new Date(a.updatedAt || a.placedAt).getTime(),
          )
          .slice(0, 8) as Order[],
      );
    } catch (err) {
      console.error(err);
      if (isManual) toast.error('Failed to refresh dashboard');
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();

    wsService.connect();
    const handleUpdate = () => {
      void fetchDashboard();
    };

    wsService.on('notification', handleUpdate);
    wsService.on('order-status-update', handleUpdate);

    // Auto-refresh every 15s
    const timer = setInterval(() => {
      void fetchDashboard();
    }, 15000);

    return () => {
      clearInterval(timer);
      wsService.off('notification', handleUpdate);
      wsService.off('order-status-update', handleUpdate);
    };
  }, [fetchDashboard]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Welcome Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-xl shrink-0">
            <Bike className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Courier Command Center</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Welcome back, {user?.fullName || 'Courier'} • Live Delivery Ops
            </p>
          </div>
        </div>

        {/* Duty Status & Manual Refresh */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsOnline(!isOnline);
              toast.success(!isOnline ? 'You are now On Duty' : 'You are now Off Duty');
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition shadow-xs ${
              isOnline
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'
              }`}
            />
            <span>{isOnline ? 'On Duty (Active)' : 'Off Duty'}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ACTIVE RUN HERO CARD (If Courier Has an Ongoing Delivery) */}
      {activeDelivery && (
        <div className="p-5 bg-gradient-to-r from-orange-500 to-amber-600 rounded-2xl text-white shadow-md animate-in fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-white/20 rounded-full text-xs font-bold backdrop-blur-xs">
                  🚨 Active Delivery in Progress
                </span>
                <span className="text-xs font-mono font-bold text-white/90">
                  #{activeDelivery.id?.slice(0, 8).toUpperCase()}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm font-semibold pt-1">
                <span className="flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-white/80 shrink-0" />
                  {activeDelivery.restaurant?.name || 'Restaurant'}
                </span>
                <span className="hidden sm:inline text-white/60">➔</span>
                <span className="flex items-center gap-1.5 text-white/95">
                  <MapPin className="w-4 h-4 text-white/80 shrink-0" />
                  {activeDelivery.deliveryAddress || 'Customer Destination'}
                </span>
              </div>

              <p className="text-xs text-white/80">
                Current Status: <strong className="capitalize">{activeDelivery.status?.replace(/_/g, ' ')}</strong>
                {' • '}Fee: <strong>৳{Number(activeDelivery.deliveryFee || 50)}</strong>
              </p>
            </div>

            <Link
              href="/agent/deliveries"
              className="px-5 py-3 bg-white text-orange-600 hover:bg-orange-50 rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2 shrink-0"
            >
              <Navigation className="w-4 h-4" />
              <span>Open Run & Navigate ➔</span>
            </Link>
          </div>
        </div>
      )}

      {/* TODAY'S EARNINGS HERO BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div className="border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-4">
          <p className="text-xs font-medium text-gray-500">Today&apos;s Earnings</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            ৳{stats.todayEarnings.toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {stats.deliveredToday} order{stats.deliveredToday === 1 ? '' : 's'} completed today
          </p>
        </div>

        <div className="border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-4">
          <p className="text-xs font-medium text-gray-500">All-Time Earnings</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            ৳{stats.totalEarnings.toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {stats.totalDelivered} lifetime deliveries
          </p>
        </div>

        <div className="flex flex-col justify-center">
          <Link
            href="/agent/earnings"
            className="inline-flex items-center justify-between p-3 bg-orange-50/70 hover:bg-orange-100/70 text-orange-700 rounded-xl text-xs font-semibold transition"
          >
            <span>View Full Payout Breakdown</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* 4 Main Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/agent/available">
          <StatCard
            title="Available Offers"
            value={stats.available}
            icon={Package}
            className="hover:border-orange-300 transition cursor-pointer"
          />
        </Link>
        <Link href="/agent/deliveries">
          <StatCard
            title="Active Runs"
            value={stats.active}
            icon={Truck}
            className="hover:border-orange-300 transition cursor-pointer"
          />
        </Link>
        <StatCard title="Delivered Today" value={stats.deliveredToday} icon={Clock} />
        <StatCard title="Total Completed" value={stats.totalDelivered} icon={CheckCircle} />
      </div>

      {/* Quick Action Navigation Hub */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/agent/available"
          className="px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition shadow-xs flex items-center gap-2"
        >
          <Bike className="w-4 h-4" />
          <span>Available Offers</span>
          {stats.available > 0 && (
            <span className="bg-white text-orange-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {stats.available}
            </span>
          )}
        </Link>
        <Link
          href="/agent/deliveries"
          className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-black transition shadow-xs flex items-center gap-2"
        >
          <Truck className="w-4 h-4" />
          <span>My Deliveries</span>
          {stats.active > 0 && (
            <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
              {stats.active}
            </span>
          )}
        </Link>
        <Link
          href="/agent/earnings"
          className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition shadow-xs flex items-center gap-2"
        >
          <DollarSign className="w-4 h-4 text-emerald-600" />
          <span>Earnings & Payouts</span>
        </Link>
        <Link
          href="/agent/schedule"
          className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition shadow-xs flex items-center gap-2"
        >
          <Calendar className="w-4 h-4 text-orange-500" />
          <span>Delivery Schedule</span>
        </Link>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Recent Assigned Deliveries</h3>
            <p className="text-xs text-gray-500 mt-0.5">Quick activity record for your runs</p>
          </div>
          <Link
            href="/agent/deliveries"
            className="text-xs font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 text-gray-500 text-xs font-semibold border-b">
              <tr>
                <th className="text-left p-4">Order ID</th>
                <th className="text-left p-4">Restaurant</th>
                <th className="text-left p-4">Destination</th>
                <th className="text-left p-4">Fee Earned</th>
                <th className="text-left p-4">Status</th>
                <th className="text-right p-4">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-500">
                    <Bike className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="font-medium text-gray-700">No deliveries on record yet</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Check Available Offers to accept your first order.
                    </p>
                  </td>
                </tr>
              ) : (
                recentOrders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-gray-50/60 transition">
                    <td className="p-4 font-mono text-xs font-bold text-gray-900">
                      #{order.id?.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="p-4 font-medium text-gray-800">
                      {order.restaurant?.name || '—'}
                    </td>
                    <td className="p-4 text-xs text-gray-600 max-w-xs truncate">
                      {order.deliveryAddress || '—'}
                    </td>
                    <td className="p-4 font-bold text-emerald-600 text-xs">
                      ৳{Number(order.deliveryFee || 50)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                          order.status === 'delivered'
                            ? 'bg-emerald-50 text-emerald-700'
                            : order.status === 'on_the_way'
                            ? 'bg-orange-50 text-orange-700'
                            : order.status === 'picked_up'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}
                      >
                        {order.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-right text-xs text-gray-400 whitespace-nowrap">
                      {order.updatedAt
                        ? new Date(order.updatedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}