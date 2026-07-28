'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  completionRate: number;
  revenueGrowth: number;
  orderGrowth: number;
  avgOrderGrowth: number;
  conversionGrowth: number;
  recentOrders: any[];
  popularItems: { name: string; sales: number; revenue: number }[];
  categoryData: { name: string; value: number; color: string }[];
  orderStatusData: { name: string; value: number; color: string }[];
  revenueTrend: { date: string; revenue: number; orders: number }[];
}

const emptyAnalytics: AnalyticsData = {
  totalRevenue: 0,
  totalOrders: 0,
  avgOrderValue: 0,
  completionRate: 0,
  revenueGrowth: 0,
  orderGrowth: 0,
  avgOrderGrowth: 0,
  conversionGrowth: 0,
  recentOrders: [],
  popularItems: [],
  categoryData: [],
  orderStatusData: [],
  revenueTrend: [],
};

const parseAmount = (amount: unknown): number => {
  if (amount === undefined || amount === null) return 0;
  if (typeof amount === 'number') return Number.isFinite(amount) ? amount : 0;
  if (typeof amount === 'string') {
    const parsed = parseFloat(amount);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const formatSafeNumber = (value: unknown): string => {
  const num = parseAmount(value);
  return Math.round(num).toLocaleString();
};

const unwrap = <T,>(payload: unknown): T => {
  if (
    payload !== null &&
    typeof payload === 'object' &&
    'data' in payload &&
    (payload as { data: unknown }).data !== undefined
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

export default function OwnerAnalyticsPage() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
  const [analytics, setAnalytics] = useState<AnalyticsData>(emptyAnalytics);

  const fetchRestaurants = useCallback(async () => {
    try {
      const currentUser = auth.getCurrentUser();
      if (!currentUser || currentUser.role !== 'owner') {
        router.push('/');
        return;
      }

      const restaurantsRes = await api.get(`/restaurants?ownerId=${currentUser.id}`);
      const ownerRestaurants = unwrap<any[]>(restaurantsRes.data) || [];
      const list = Array.isArray(ownerRestaurants) ? ownerRestaurants : [];

      setRestaurants(list);
      if (list.length > 0) {
        setSelectedRestaurant((prev) => prev || list[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error('Failed to load restaurants');
    }
  }, [router]);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { period };
      if (selectedRestaurant) {
        params.restaurantId = selectedRestaurant;
      }

      const res = await api.get('/orders/owner/analytics', { params });
      const payload = unwrap<Partial<AnalyticsData>>(res.data) || {};

      setAnalytics({
        ...emptyAnalytics,
        totalRevenue: parseAmount(payload.totalRevenue),
        totalOrders: parseAmount(payload.totalOrders),
        avgOrderValue: parseAmount(payload.avgOrderValue),
        completionRate: parseAmount(payload.completionRate),
        revenueGrowth: parseAmount(payload.revenueGrowth),
        orderGrowth: parseAmount(payload.orderGrowth),
        avgOrderGrowth: parseAmount(payload.avgOrderGrowth),
        conversionGrowth: parseAmount(payload.conversionGrowth),
        recentOrders: Array.isArray(payload.recentOrders) ? payload.recentOrders : [],
        popularItems: Array.isArray(payload.popularItems) ? payload.popularItems : [],
        categoryData: Array.isArray(payload.categoryData) ? payload.categoryData : [],
        orderStatusData: Array.isArray(payload.orderStatusData)
          ? payload.orderStatusData
          : [],
        revenueTrend: Array.isArray(payload.revenueTrend) ? payload.revenueTrend : [],
      });
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics data');
      setAnalytics(emptyAnalytics);
    } finally {
      setLoading(false);
    }
  }, [period, selectedRestaurant]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 bg-gray-100 rounded-2xl border border-gray-100"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-80 bg-gray-100 rounded-2xl border border-gray-100" />
          <div className="h-80 bg-gray-100 rounded-2xl border border-gray-100" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Revenue',
      value: `৳${formatSafeNumber(analytics.totalRevenue)}`,
      growth: analytics.revenueGrowth,
      icon: <DollarSign className="w-5 h-5" />,
      tint: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Total Orders',
      value: formatSafeNumber(analytics.totalOrders),
      growth: analytics.orderGrowth,
      icon: <ShoppingBag className="w-5 h-5" />,
      tint: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Avg Order Value',
      value: `৳${formatSafeNumber(analytics.avgOrderValue)}`,
      growth: analytics.avgOrderGrowth,
      icon: <TrendingUp className="w-5 h-5" />,
      tint: 'bg-purple-50 text-purple-600',
    },
    {
      label: 'Completion Rate',
      value: `${formatSafeNumber(analytics.completionRate)}%`,
      growth: analytics.conversionGrowth,
      icon: <CheckCircle className="w-5 h-5" />,
      tint: 'bg-orange-50 text-orange-600',
    },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track your business performance
          </p>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {(['week', 'month', 'year'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                period === p
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {restaurants.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-6 -mx-1 px-1">
          <button
            type="button"
            onClick={() => setSelectedRestaurant('')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap border ${
              selectedRestaurant === ''
                ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            All restaurants
          </button>
          {restaurants.map((restaurant) => (
            <button
              key={restaurant.id}
              type="button"
              onClick={() => setSelectedRestaurant(restaurant.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap border ${
                selectedRestaurant === restaurant.id
                  ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {restaurant.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-5"
          >
            <div className="flex items-center justify-between mb-4">
              <span
                className={`flex items-center justify-center w-10 h-10 rounded-xl ${stat.tint}`}
              >
                {stat.icon}
              </span>
              <span
                className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                  stat.growth >= 0
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {stat.growth >= 0 ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {Math.abs(stat.growth)}%
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {stat.value}
            </p>
            <p className="text-sm text-gray-400 mt-1">{stat.label}</p>
            <p className="text-[11px] text-gray-300 mt-0.5">vs. last {period}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            Revenue & Orders Trend
          </h3>
          {analytics.revenueTrend.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-24">
              No trend data yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#94a3b8"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #f1f5f9',
                    fontSize: 13,
                  }}
                  formatter={(value: unknown, name: unknown) => {
                    const label = String(name ?? '');
                    if (label.includes('Revenue')) {
                      return [`৳${formatSafeNumber(value)}`, label];
                    }
                    return [formatSafeNumber(value), label];
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#f97316"
                  strokeWidth={2.5}
                  dot={false}
                  name="Revenue (৳)"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="orders"
                  stroke="#3b82f6"
                  strokeWidth={2.5}
                  dot={false}
                  name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">
            Order Status Distribution
          </h3>
          {analytics.orderStatusData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-24">
              No status data yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.orderStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) =>
                    `${entry.name ?? ''}: ${formatSafeNumber(entry.value)}`
                  }
                  outerRadius={100}
                  dataKey="value"
                >
                  {analytics.orderStatusData.map((entry, index) => (
                    <Cell key={`status-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #f1f5f9',
                    fontSize: 13,
                  }}
                  formatter={(value: unknown) => formatSafeNumber(value)}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {analytics.categoryData.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-6">
            <h3 className="font-semibold text-gray-800 mb-4">
              Popular Items by Category
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry: any) =>
                    `${entry.name ?? ''}: ${formatSafeNumber(entry.value)}%`
                  }
                  outerRadius={100}
                  dataKey="value"
                >
                  {analytics.categoryData.map((entry, index) => (
                    <Cell key={`cat-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #f1f5f9',
                    fontSize: 13,
                  }}
                  formatter={(value: unknown) => `${formatSafeNumber(value)}%`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        <div
          className={`bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-6 ${
            analytics.categoryData.length === 0 ? 'lg:col-span-2' : ''
          }`}
        >
          <h3 className="font-semibold text-gray-800 mb-4">
            Top Performing Items
          </h3>
          {analytics.popularItems.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-16">
              No completed order items yet
            </p>
          ) : (
            <div className="space-y-2">
              {analytics.popularItems.map((item, idx) => (
                <div
                  key={`${item.name}-${idx}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 text-xs font-semibold text-gray-500">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-medium text-sm text-gray-800">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        Sold: {formatSafeNumber(item.sales)}
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-sm text-orange-600 tabular-nums">
                    ৳{formatSafeNumber(item.revenue)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}