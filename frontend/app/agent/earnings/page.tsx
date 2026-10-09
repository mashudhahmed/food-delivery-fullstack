'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Order } from '@/types';
import { unwrapPaginated } from '@/lib/unwrapPaginated';
import { StatCard } from '@/components/StatCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import {
  DollarSign,
  Package,
  TrendingUp,
  Calendar,
  Clock,
  Search,
  Bike,
  Store,
  MapPin,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type PeriodFilter = 'today' | 'week' | 'month' | 'all';

export default function AgentEarningsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('week');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchEarnings = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      const currentUser = auth.getCurrentUser();
      if (!currentUser?.id) return;

      const agentId = currentUser.id;
      const res = await api.get('/orders/agent/my');
      const allOrders = unwrapPaginated(res.data).items;

      const delivered = allOrders.filter((order: any) => {
        const isAssignedToMe =
          order.agentId === agentId || order.agent?.id === agentId;
        return isAssignedToMe && order.status === 'delivered';
      });

      setOrders(
        delivered.sort(
          (a: any, b: any) =>
            new Date(b.updatedAt || b.placedAt).getTime() -
            new Date(a.updatedAt || a.placedAt).getTime(),
        ) as Order[],
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchEarnings();
  }, [fetchEarnings]);

  // Filter orders by chosen period
  const filteredOrders = useMemo(() => {
    const now = new Date();

    return orders.filter((order: any) => {
      const orderDate = new Date(order.updatedAt || order.placedAt);

      if (selectedPeriod === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return orderDate >= today;
      }

      if (selectedPeriod === 'week') {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(now.getDate() - 7);
        return orderDate >= sevenDaysAgo;
      }

      if (selectedPeriod === 'month') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        return orderDate >= thirtyDaysAgo;
      }

      return true; // 'all'
    });
  }, [orders, selectedPeriod]);

  // Search filtered orders for ledger
  const searchedOrders = useMemo(() => {
    if (!searchQuery.trim()) return filteredOrders;
    const q = searchQuery.toLowerCase();
    return filteredOrders.filter(
      (o: any) =>
        o.id?.toLowerCase().includes(q) ||
        o.restaurant?.name?.toLowerCase().includes(q) ||
        o.deliveryAddress?.toLowerCase().includes(q),
    );
  }, [filteredOrders, searchQuery]);

  // Calculate metrics for selected period
  const periodEarnings = useMemo(() => {
    return filteredOrders.reduce(
      (sum, o) => sum + (Number(o.deliveryFee) || 50),
      0,
    );
  }, [filteredOrders]);

  const avgPerDelivery = useMemo(() => {
    return filteredOrders.length
      ? Math.round(periodEarnings / filteredOrders.length)
      : 0;
  }, [filteredOrders, periodEarnings]);

  // Chart data: Last 7 days breakdown
  const weeklyChartData = useMemo(() => {
    const days: { day: string; dateStr: string; earnings: number; count: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayName = d.toLocaleDateString([], { weekday: 'short' });
      const dateKey = d.toDateString();

      const dayOrders = orders.filter((o: any) => {
        const od = new Date(o.updatedAt || o.placedAt);
        return od.toDateString() === dateKey;
      });

      const dayEarned = dayOrders.reduce(
        (sum, o) => sum + (Number(o.deliveryFee) || 50),
        0,
      );

      days.push({
        day: dayName,
        dateStr: d.toLocaleDateString([], { month: 'numeric', day: 'numeric' }),
        earnings: dayEarned,
        count: dayOrders.length,
      });
    }

    return days;
  }, [orders]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Earnings & Payouts</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Track your delivery fees, daily earnings trends, and payout history
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fetchEarnings(true)}
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
            className="flex items-center gap-1.5 px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Active Deliveries</span>
          </Link>
        </div>
      </div>

      {/* Time Period Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(
          [
            { id: 'today', label: 'Today' },
            { id: 'week', label: 'Past 7 Days' },
            { id: 'month', label: 'Past 30 Days' },
            { id: 'all', label: 'All-Time Lifetime' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedPeriod(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              selectedPeriod === tab.id
                ? 'bg-gray-900 text-white shadow-xs'
                : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium">Period Earnings</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-emerald-600">
            ৳{periodEarnings.toLocaleString()}
          </p>
          <p className="text-[11px] text-gray-400">
            Based on {selectedPeriod === 'today' ? 'today’s' : selectedPeriod} completed runs
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium">Completed Runs</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900">
            {filteredOrders.length}
          </p>
          <p className="text-[11px] text-gray-400">
            Deliveries successfully completed
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium">Average Per Run</span>
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-black text-gray-900">
            ৳{avgPerDelivery}
          </p>
          <p className="text-[11px] text-gray-400">
            Net courier compensation per order
          </p>
        </div>
      </div>

      {/* Weekly Earnings Trend Bar Chart */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">7-Day Earnings Trend</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Daily delivery fees earned over the past week
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
            ৳{weeklyChartData.reduce((s, d) => s + d.earnings, 0).toLocaleString()} 7-Day Total
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `৳${val}`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: '1px solid #f1f5f9',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: 12,
                }}
                formatter={(value: any) => [`৳${value}`, 'Earned']}
                labelFormatter={(label, payload) => {
                  const dateStr = payload?.[0]?.payload?.dateStr || '';
                  return `${label} (${dateStr})`;
                }}
              />
              <Bar dataKey="earnings" fill="#f97316" radius={[6, 6, 0, 0]} maxBarSize={45} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Payout History Ledger Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900">Delivery Payout History</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Detailed ledger of all fulfilled orders for this period
            </p>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, restaurant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 w-full sm:w-56"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 text-gray-500 text-xs font-semibold border-b">
              <tr>
                <th className="text-left p-4">Order ID</th>
                <th className="text-left p-4">Restaurant</th>
                <th className="text-left p-4">Dropoff Address</th>
                <th className="text-left p-4">Delivered At</th>
                <th className="text-right p-4">Courier Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {searchedOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-gray-500">
                    <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="font-medium text-gray-700">No completed orders found</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Completed deliveries for this filter will show up here.
                    </p>
                  </td>
                </tr>
              ) : (
                searchedOrders.map((order: any) => (
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
                    <td className="p-4 text-xs text-gray-500">
                      {order.updatedAt
                        ? new Date(order.updatedAt).toLocaleString([], {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : '—'}
                    </td>
                    <td className="p-4 text-right font-black text-emerald-600">
                      ৳{Number(order.deliveryFee || 50).toFixed(0)}
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

