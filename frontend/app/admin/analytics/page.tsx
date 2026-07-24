'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { DollarSign, ShoppingBag, TrendingUp, Download, RefreshCw } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

interface RevenueDataPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface OrderDataPoint {
  date: string;
  orders: number;
  amount: number;
}

interface UserDataPoint {
  month: string;
  customers: number;
  owners: number;
  agents: number;
}

// ✅ Helper to ensure array, in case the API wraps the list in an object
const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  console.warn('⚠️ Unexpected chart data format:', typeof data, data);
  return [];
};

export default function AnalyticsPage() {
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [orderData, setOrderData] = useState<OrderDataPoint[]>([]);
  const [userData, setUserData] = useState<UserDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    fetchChartData();
  }, [dateRange]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      const [revenue, orders, users] = await Promise.all([
        api.get('/admin/charts/revenue'),
        api.get(`/admin/charts/orders?days=${dateRange}`),
        api.get('/admin/charts/users'),
      ]);

      setRevenueData(ensureArray(revenue.data));
      setOrderData(ensureArray(orders.data));
      setUserData(ensureArray(users.data));
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      toast.error('Failed to load analytics data');
      setRevenueData([]);
      setOrderData([]);
      setUserData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/admin/export/analytics', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `analytics_${new Date().toISOString()}.csv`);
      link.click();
      link.remove();
      toast.success('Analytics exported successfully');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  const calculateTotals = () => {
    const totalRevenue = revenueData.reduce((sum, d) => sum + (d.revenue || 0), 0);
    const totalOrders = orderData.reduce((sum, d) => sum + (d.orders || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    return { totalRevenue, totalOrders, avgOrderValue };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl border border-gray-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-80 bg-gray-100 rounded-2xl border border-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Total Revenue', value: `৳${Math.round(totals.totalRevenue).toLocaleString()}`, icon: DollarSign, tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Total Orders', value: totals.totalOrders.toLocaleString(), icon: ShoppingBag, tint: 'bg-blue-50 text-blue-600' },
    { label: 'Average Order Value', value: `৳${Math.round(totals.avgOrderValue).toLocaleString()}`, icon: TrendingUp, tint: 'bg-purple-50 text-purple-600' },
  ];

  const keyMetrics = [
    { label: 'Conversion Rate', value: '↑ 12.5%', color: 'text-emerald-600' },
    { label: 'Customer Retention', value: '78.3%', color: 'text-blue-600' },
    { label: 'Avg Delivery Time', value: '32 mins', color: 'text-orange-600' },
    { label: 'Customer Satisfaction', value: '4.8/5.0', color: 'text-emerald-600' },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition cursor-pointer"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
          <button
            onClick={handleExport}
            className="px-3.5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={fetchChartData}
            className="px-3.5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 tabular-nums mt-1">{stat.value}</p>
              </div>
              <span className={`flex items-center justify-center w-11 h-11 rounded-xl ${stat.tint}`}>
                <stat.icon className="w-5 h-5" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 13 }} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} dot={false} name="Revenue (৳)" />
              <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Order Volume</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={orderData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 13 }} />
              <Legend />
              <Bar dataKey="orders" fill="#f97316" name="Orders" radius={[4, 4, 0, 0]} />
              <Bar dataKey="amount" fill="#10b981" name="Amount (৳)" radius={[4, 4, 0, 0]} />
            </BarChart>
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
              <Bar dataKey="owners" fill="#10b981" name="Restaurant Owners" radius={[4, 4, 0, 0]} />
              <Bar dataKey="agents" fill="#3b82f6" name="Delivery Agents" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Key Metrics</h3>
          <div className="space-y-2.5">
            {keyMetrics.map((metric) => (
              <div key={metric.label} className="flex justify-between items-center p-3.5 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">{metric.label}</span>
                <span className={`font-semibold text-sm ${metric.color}`}>{metric.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}