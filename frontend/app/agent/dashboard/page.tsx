'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { api } from '@/lib/api';
import { Order } from '@/types';
import { 
  Package, 
  CheckCircle, 
  Navigation, 
  DollarSign, 
  Star,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DashboardStats {
  activeDeliveries: number;
  completedToday: number;
  totalEarnings: number;
  totalDeliveries: number;
  rating: number;
  onTimeDelivery: number;
  earningsGrowth: number;
  deliveryGrowth: number;
}

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {trend >= 0 ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
            <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(trend)}% from last month
            </span>
          </div>
        )}
      </div>
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

export default function AgentDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeDeliveries: 0,
    completedToday: 0,
    totalEarnings: 0,
    totalDeliveries: 0,
    rating: 4.8,
    onTimeDelivery: 96,
    earningsGrowth: 12.5,
    deliveryGrowth: 8.3,
  });

  const [earningsData, setEarningsData] = useState([
    { day: 'Mon', earnings: 450, deliveries: 4 },
    { day: 'Tue', earnings: 520, deliveries: 5 },
    { day: 'Wed', earnings: 380, deliveries: 3 },
    { day: 'Thu', earnings: 620, deliveries: 6 },
    { day: 'Fri', earnings: 750, deliveries: 8 },
    { day: 'Sat', earnings: 680, deliveries: 7 },
    { day: 'Sun', earnings: 480, deliveries: 4 },
  ]);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser || currentUser.role !== 'agent') {
      router.push('/');
      return;
    }
    setUser(currentUser);
    fetchAgentData();
  }, []);

  const fetchAgentData = async () => {
    try {
      const response = await api.get('/orders/my');
      const allOrders: Order[] = response.data || [];
      
      const assigned = allOrders.filter((order: Order) => {
        const isAssignedToMe = order.agentId === user?.id || order.agent?.id === user?.id;
        return isAssignedToMe;
      });
      
      setAssignedOrders(assigned);
      
      const activeDeliveries = assigned.filter(o => o.status === 'picked_up').length;
      const completedToday = assigned.filter(o => o.status === 'delivered').length;
      const totalEarnings = assigned
        .filter(o => o.status === 'delivered')
        .reduce((sum, o) => sum + (o.deliveryFee || 50), 0);
      const totalDeliveries = assigned.filter(o => o.status === 'delivered').length;
      
      setStats(prev => ({
        ...prev,
        activeDeliveries,
        completedToday,
        totalEarnings,
        totalDeliveries
      }));
      
    } catch (error) {
      console.error('Failed to fetch agent data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
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
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.fullName?.split(' ')[0] || 'Agent'}</p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Active Deliveries"
          value={stats.activeDeliveries}
          icon={Navigation}
          color="bg-gradient-to-r from-orange-500 to-orange-600"
        />
        <StatCard
          title="Completed Today"
          value={stats.completedToday}
          icon={CheckCircle}
          color="bg-gradient-to-r from-green-500 to-green-600"
        />
        <StatCard
          title="Total Earnings"
          value={`৳${stats.totalEarnings}`}
          icon={DollarSign}
          trend={stats.earningsGrowth}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
        />
        <StatCard
          title="Rating"
          value={stats.rating}
          icon={Star}
          color="bg-gradient-to-r from-purple-500 to-purple-600"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Total Deliveries</p>
          <p className="text-xl font-bold">{stats.totalDeliveries}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-xs text-gray-500">On-Time Rate</p>
          <p className="text-xl font-bold text-green-600">{stats.onTimeDelivery}%</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Acceptance Rate</p>
          <p className="text-xl font-bold">94%</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Avg per Delivery</p>
          <p className="text-xl font-bold">৳{stats.totalDeliveries ? Math.round(stats.totalEarnings / stats.totalDeliveries) : 0}</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Earnings Overview (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={earningsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="earnings" stroke="#f97316" strokeWidth={2} name="Earnings (৳)" />
            <Line yAxisId="right" type="monotone" dataKey="deliveries" stroke="#3b82f6" strokeWidth={2} name="Deliveries" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}