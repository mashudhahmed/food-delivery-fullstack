'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  DollarSign,
  Users,
  ShoppingBag,
  CheckCircle,
  Star,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  History,
  Store,
  Bike,
  Settings,
  RefreshCw,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface DashboardStats {
  totalUsers: number;
  totalRestaurants: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOwners: number;
  pendingAgents: number;
  activeAgents: number;
  avgRating: number;
  revenueGrowth: number;
  orderGrowth: number;
  userGrowth: number;
  completionRate: number;
}

interface ActivityItem {
  id: string;
  type: string;
  action: string;
  resource: string;
  resourceId: string;
  message: string;
  actorName: string;
  actorRole?: string | null;
  wasSuccessful: boolean;
  timestamp: string;
}

const ensureArray = (data: unknown): any[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data;
    if (Array.isArray(record.items)) return record.items;
  }
  return [];
};

const formatTimeAgo = (timestamp: string): string => {
  try {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return 'recently';
  }
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  tint,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  trend?: number;
  tint: string;
  subtitle?: string;
}) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-5 hover:shadow-md hover:shadow-black/4 transition-all">
    <div className="flex items-center justify-between mb-3">
      <span className={`flex items-center justify-center w-10 h-10 rounded-xl ${tint}`}>
        <Icon className="w-5 h-5" />
      </span>
      {trend !== undefined && trend !== null && !isNaN(trend) && (
        <span
          className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
            trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}
        >
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}% vs last mo
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
    <div className="flex items-center justify-between mt-1">
      <p className="text-sm text-gray-500 font-medium">{title}</p>
      {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
    </div>
  </div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalRestaurants: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOwners: 0,
    pendingAgents: 0,
    activeAgents: 0,
    avgRating: 0,
    revenueGrowth: 0,
    orderGrowth: 0,
    userGrowth: 0,
    completionRate: 0,
  });
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [userData, setUserData] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    try {
      const [statsRes, revenueRes, usersRes, activityRes] = await Promise.allSettled([
        api.get('/admin/dashboard/stats'),
        api.get('/admin/charts/revenue'),
        api.get('/admin/charts/users'),
        api.get('/admin/activity?limit=6'),
      ]);

      if (statsRes.status === 'fulfilled') {
        const raw = statsRes.value.data;
        const statsData = raw?.totalRevenue !== undefined ? raw : raw?.data || raw || {};
        setStats((prev) => ({ ...prev, ...statsData }));
      }

      if (revenueRes.status === 'fulfilled') {
        setRevenueData(ensureArray(revenueRes.value.data));
      }

      if (usersRes.status === 'fulfilled') {
        setUserData(ensureArray(usersRes.value.data));
      }

      if (activityRes.status === 'fulfilled') {
        const rawAct = activityRes.value.data;
        const acts = Array.isArray(rawAct)
          ? rawAct
          : rawAct?.data && Array.isArray(rawAct.data)
          ? rawAct.data
          : [];
        setRecentActivities(acts.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const totalPending = (stats.pendingOwners || 0) + (stats.pendingAgents || 0);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="h-16 bg-gray-100 rounded-2xl border border-gray-100" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl border border-gray-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-80 bg-gray-100 rounded-2xl border border-gray-100" />
          <div className="h-80 bg-gray-100 rounded-2xl border border-gray-100" />
        </div>
      </div>
    );
  }

  const secondaryTiles = [
    {
      label: 'Active Restaurants',
      value: (stats.totalRestaurants || 0).toLocaleString(),
      accent: 'text-gray-900',
    },
    {
      label: 'Active Couriers',
      value: (stats.activeAgents || 0).toLocaleString(),
      accent: 'text-gray-900',
    },
    {
      label: 'Pending Owners',
      value: stats.pendingOwners || 0,
      accent: stats.pendingOwners > 0 ? 'text-amber-600' : 'text-gray-600',
    },
    {
      label: 'Pending Couriers',
      value: stats.pendingAgents || 0,
      accent: stats.pendingAgents > 0 ? 'text-blue-600' : 'text-gray-600',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time platform metrics, dispatch health, and operational triage
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleManualRefresh}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <Link
            href="/admin/activity"
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-orange-600 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition shadow-xs"
          >
            <History className="w-4 h-4" /> Activity Logs
          </Link>
        </div>
      </div>

      {/* Operational Attention Banner (if pending items) */}
      {totalPending > 0 && (
        <div className="mb-6 p-4 bg-linear-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200/80 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950">
                Action Required: {totalPending} Partner Application{totalPending > 1 ? 's' : ''} Awaiting Review
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                {stats.pendingOwners || 0} restaurant merchant{stats.pendingOwners !== 1 ? 's' : ''} and{' '}
                {stats.pendingAgents || 0} courier{stats.pendingAgents !== 1 ? 's' : ''} are pending approval before they can operate.
              </p>
            </div>
          </div>
          <Link
            href="/admin/applications"
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl transition shadow-xs shrink-0 self-start sm:self-auto"
          >
            Review Applications <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Core KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value={`৳${(stats.totalRevenue || 0).toLocaleString()}`}
          icon={DollarSign}
          trend={stats.revenueGrowth}
          tint="bg-emerald-50 text-emerald-600"
          subtitle="Delivered Orders"
        />
        <StatCard
          title="Total Orders"
          value={(stats.totalOrders || 0).toLocaleString()}
          icon={ShoppingBag}
          trend={stats.orderGrowth}
          tint="bg-blue-50 text-blue-600"
          subtitle="Lifetime volume"
        />
        <StatCard
          title="Total Users"
          value={(stats.totalUsers || 0).toLocaleString()}
          icon={Users}
          trend={stats.userGrowth}
          tint="bg-purple-50 text-purple-600"
          subtitle="All accounts"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate || 0}%`}
          icon={CheckCircle}
          tint="bg-orange-50 text-orange-600"
          subtitle="Delivered / Placed"
        />
      </div>

      {/* Operational Triage Quick-Nav Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Link
          href="/admin/orders"
          className="p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-orange-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-gray-500 group-hover:text-orange-600">
            <ShoppingBag className="w-4 h-4" />
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="font-semibold text-sm text-gray-900 mt-2">Live Dispatch</p>
          <p className="text-xs text-gray-400 mt-0.5">Manage live orders &amp; fleet</p>
        </Link>

        <Link
          href="/admin/applications"
          className="p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-orange-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-gray-500 group-hover:text-orange-600">
            <Store className="w-4 h-4" />
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
              {totalPending}
            </span>
          </div>
          <p className="font-semibold text-sm text-gray-900 mt-2">Partner KYC</p>
          <p className="text-xs text-gray-400 mt-0.5">Review owner &amp; courier signups</p>
        </Link>

        <Link
          href="/admin/activity"
          className="p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-orange-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-gray-500 group-hover:text-orange-600">
            <Activity className="w-4 h-4" />
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="font-semibold text-sm text-gray-900 mt-2">Audit Logs</p>
          <p className="text-xs text-gray-400 mt-0.5">Security &amp; system traces</p>
        </Link>

        <Link
          href="/admin/settings"
          className="p-3.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-orange-200 hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between text-gray-500 group-hover:text-orange-600">
            <Settings className="w-4 h-4" />
            <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="font-semibold text-sm text-gray-900 mt-2">Platform Rates</p>
          <p className="text-xs text-gray-400 mt-0.5">Commission &amp; delivery fee</p>
        </Link>
      </div>

      {/* Secondary Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {secondaryTiles.map((tile) => (
          <div
            key={tile.label}
            className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-black/2 p-3.5"
          >
            <p className="text-xs text-gray-400 font-medium">{tile.label}</p>
            <p className={`text-xl font-bold tabular-nums mt-0.5 ${tile.accent}`}>{tile.value}</p>
          </div>
        ))}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-black/2 p-3.5 col-span-2 md:col-span-1">
          <p className="text-xs text-gray-400 font-medium">Customer Satisfaction</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xl font-bold text-gray-900 tabular-nums">
              {(stats.avgRating || 0).toFixed(1)}
            </p>
            <div className="flex items-center text-amber-400">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
            <span className="text-[11px] text-gray-400">/ 5.0</span>
          </div>
        </div>
      </div>

      {/* Charts & Live Activity Stream Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue Trends Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900">Revenue &amp; Orders Trend</h3>
              <p className="text-xs text-gray-400 mt-0.5">Historical order volume and GMV performance</p>
            </div>
            <span className="text-xs px-2.5 py-1 bg-gray-100 rounded-full text-gray-600 font-medium">
              30-Day Window
            </span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 13 }}
                formatter={(value: any, name: any) => {
                  if (name === 'Revenue') return [`৳${Number(value).toLocaleString()}`, 'Revenue'];
                  return [value, 'Orders'];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#f97316"
                strokeWidth={2.5}
                dot={false}
                name="Revenue"
              />
              <Line
                type="monotone"
                dataKey="orders"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                name="Orders"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Live Recent Platform Events Stream (1 Column) */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-6 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="font-bold text-gray-900 text-sm">Recent Activity</h3>
            </div>
            <Link
              href="/admin/activity"
              className="text-xs text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
            >
              Full Feed <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto">
            {recentActivities.length > 0 ? (
              recentActivities.map((act) => (
                <div
                  key={act.id}
                  className="p-3 bg-gray-50/70 hover:bg-gray-100/70 rounded-xl transition text-xs border border-gray-100/80"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-gray-900 truncate max-w-[140px]">
                      {act.actorName || 'System'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3 text-gray-300" />
                      {formatTimeAgo(act.timestamp)}
                    </span>
                  </div>
                  <p className="text-gray-600 line-clamp-2 leading-relaxed">{act.message}</p>
                  <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-200/50 text-[10px]">
                    <span className="font-mono text-gray-400 uppercase">
                      {act.resource || 'SYSTEM'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        act.wasSuccessful ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {act.wasSuccessful ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> OK
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" /> Failed
                        </>
                      )}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-gray-400">
                <Activity className="w-6 h-6 mx-auto mb-2 text-gray-300" />
                <p className="text-xs font-medium">No recent platform activity</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* User Growth Bar Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900">User Growth Breakdown</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Monthly acquisition across Customers, Restaurant Owners, and Couriers
            </p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={userData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 13 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="customers" fill="#f97316" name="Customers" radius={[4, 4, 0, 0]} />
            <Bar dataKey="owners" fill="#10b981" name="Owners" radius={[4, 4, 0, 0]} />
            <Bar dataKey="agents" fill="#3b82f6" name="Couriers" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}