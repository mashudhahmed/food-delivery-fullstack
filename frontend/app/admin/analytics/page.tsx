'use client';

import { useEffect, useState } from 'react';
import { api } from '@/app/lib/api';
import { DollarSign, ShoppingBag, TrendingUp, Download, RefreshCw } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

// Type definitions
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
    try {
      const [revenue, orders, users] = await Promise.all([
        api.get('/admin/charts/revenue'),
        api.get(`/admin/charts/orders?days=${dateRange}`),
        api.get('/admin/charts/users'),
      ]);
      
      setRevenueData(revenue.data || []);
      setOrderData(orders.data || []);
      setUserData(users.data || []);
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      toast.error('Failed to load analytics data');
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
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Analytics Dashboard</h1>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last Year</option>
          </select>
          <button onClick={handleExport} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button onClick={fetchChartData} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">৳{Math.round(totals.totalRevenue).toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{totals.totalOrders.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Average Order Value</p>
              <p className="text-2xl font-bold text-gray-900">৳{Math.round(totals.avgOrderValue).toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Revenue Trend</h3>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} name="Revenue (৳)" />
              <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Order Volume</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={orderData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="orders" fill="#f97316" name="Orders" />
              <Bar dataKey="amount" fill="#10b981" name="Amount (৳)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={userData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="customers" fill="#f97316" name="Customers" />
              <Bar dataKey="owners" fill="#10b981" name="Restaurant Owners" />
              <Bar dataKey="agents" fill="#3b82f6" name="Delivery Agents" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Key Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Conversion Rate</span>
              <span className="font-semibold text-green-600">↑ 12.5%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Customer Retention</span>
              <span className="font-semibold text-blue-600">78.3%</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Avg Delivery Time</span>
              <span className="font-semibold text-orange-600">32 mins</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Customer Satisfaction</span>
              <span className="font-semibold text-green-600">4.8/5.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}