'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { 
  DollarSign, 
  Users, 
  ShoppingBag, 
  CheckCircle,
  Star,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { StatCard } from '@/components/admin/StatCard';

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
  const [revenueData, setRevenueData] = useState([]);
  const [userData, setUserData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchChartData();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/dashboard/stats');
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to load stats');
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const [revenue, users] = await Promise.all([
        api.get('/admin/charts/revenue'),
        api.get('/admin/charts/users'),
      ]);
      setRevenueData(revenue.data);
      setUserData(users.data);
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={stats.totalRevenue}
          icon={DollarSign}
          trend={stats.revenueGrowth}
          format="currency"
          color="bg-gradient-to-r from-green-500 to-green-600"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          icon={ShoppingBag}
          trend={stats.orderGrowth}
          format="number"
          color="bg-gradient-to-r from-blue-500 to-blue-600"
        />
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          trend={stats.userGrowth}
          format="number"
          color="bg-gradient-to-r from-purple-500 to-purple-600"
        />
        <StatCard
          title="Completion Rate"
          value={stats.completionRate}
          icon={CheckCircle}
          format="percentage"
          color="bg-gradient-to-r from-orange-500 to-orange-600"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Restaurants</p>
          <p className="text-xl font-bold">{stats.totalRestaurants.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Active Agents</p>
          <p className="text-xl font-bold">{stats.activeAgents.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Pending Owners</p>
          <p className="text-xl font-bold text-yellow-600">{stats.pendingOwners}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Pending Agents</p>
          <p className="text-xl font-bold text-yellow-600">{stats.pendingAgents}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Avg Rating</p>
          <div className="flex items-center gap-1">
            <p className="text-xl font-bold">{stats.avgRating.toFixed(1)}</p>
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip 
                formatter={(value: any, name: any) => {
                  if (name === 'revenue') return [`৳${value.toLocaleString()}`, 'Revenue'];
                  return [value, 'Orders'];
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} name="Revenue" />
              <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">User Growth</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={userData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="customers" fill="#f97316" name="Customers" />
              <Bar dataKey="owners" fill="#10b981" name="Owners" />
              <Bar dataKey="agents" fill="#3b82f6" name="Agents" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}