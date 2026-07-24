'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DollarSign, Users, ShoppingBag, CheckCircle, Star, TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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

// ✅ Ensure array in case an endpoint wraps its list in an object
const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  console.warn('⚠️ Unexpected chart data format:', typeof data, data);
  return [];
};

const StatCard = ({ title, value, icon: Icon, trend, tint }: any) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-5 hover:shadow-md hover:shadow-black/4 transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <span className={`flex items-center justify-center w-10 h-10 rounded-xl ${tint}`}>
        <Icon className="w-5 h-5" />
      </span>
      {trend !== undefined && trend !== null && !isNaN(trend) && (
        <span
          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}
        >
          {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(trend)}%
        </span>
      )}
    </div>
    <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
    <p className="text-sm text-gray-400 mt-1">{title}</p>
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchChartData();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/dashboard/stats');
      const raw = response.data;
      // ✅ Unwrap in case the backend wraps the object (e.g. { data: {...} }),
      // otherwise a partial/wrapped response silently leaves every stat at 0
      // instead of showing real numbers.
      const statsData = raw?.totalRevenue !== undefined ? raw : raw?.data || raw || {};
      setStats((prev) => ({ ...prev, ...statsData }));
    } catch (error) {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const [revenue, users] = await Promise.all([api.get('/admin/charts/revenue'), api.get('/admin/charts/users')]);
      setRevenueData(ensureArray(revenue.data));
      setUserData(ensureArray(users.data));
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
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
    { label: 'Restaurants', value: (stats.totalRestaurants || 0).toLocaleString(), accent: 'text-gray-900' },
    { label: 'Active Agents', value: (stats.activeAgents || 0).toLocaleString(), accent: 'text-gray-900' },
    { label: 'Pending Owners', value: stats.pendingOwners || 0, accent: 'text-amber-600' },
    { label: 'Pending Agents', value: stats.pendingAgents || 0, accent: 'text-amber-600' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide performance at a glance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total Revenue"
          value={`৳${(stats.totalRevenue || 0).toLocaleString()}`}
          icon={DollarSign}
          trend={stats.revenueGrowth}
          tint="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Total Orders"
          value={(stats.totalOrders || 0).toLocaleString()}
          icon={ShoppingBag}
          trend={stats.orderGrowth}
          tint="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Total Users"
          value={(stats.totalUsers || 0).toLocaleString()}
          icon={Users}
          trend={stats.userGrowth}
          tint="bg-purple-50 text-purple-600"
        />
        <StatCard title="Completion Rate" value={`${stats.completionRate || 0}%`} icon={CheckCircle} tint="bg-orange-50 text-orange-600" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        {secondaryTiles.map((tile) => (
          <div key={tile.label} className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-black/2 p-3.5">
            <p className="text-xs text-gray-400">{tile.label}</p>
            <p className={`text-xl font-bold tabular-nums mt-0.5 ${tile.accent}`}>{tile.value}</p>
          </div>
        ))}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-black/2 p-3.5">
          <p className="text-xs text-gray-400">Avg Rating</p>
          <div className="flex items-center gap-1 mt-0.5">
            <p className="text-xl font-bold text-gray-900 tabular-nums">{(stats.avgRating || 0).toFixed(1)}</p>
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 13 }}
                formatter={(value: any, name: any) => {
                  if (name === 'Revenue') return [`৳${Number(value).toLocaleString()}`, 'Revenue'];
                  return [value, 'Orders'];
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} dot={false} name="Revenue" />
              <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 13 }} />
              <Legend />
              <Bar dataKey="customers" fill="#f97316" name="Customers" radius={[4, 4, 0, 0]} />
              <Bar dataKey="owners" fill="#10b981" name="Owners" radius={[4, 4, 0, 0]} />
              <Bar dataKey="agents" fill="#3b82f6" name="Agents" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}