'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { api } from '@/lib/api';
import { Order } from '@/types';
import {
  Navigation,
  CheckCircle,
  DollarSign,
  Star,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ✅ Helper to ensure array, in case the API wraps the list in an object
const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.orders && Array.isArray(data.orders)) return data.orders;
  console.warn('⚠️ Unexpected data format for orders:', typeof data, data);
  return [];
};

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

const StatCard = ({ title, value, icon: Icon, trend, tint }: any) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-5 hover:shadow-md hover:shadow-black/4 transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <span className={`flex items-center justify-center w-10 h-10 rounded-xl ${tint}`}>
        <Icon className="w-5 h-5" />
      </span>
      {trend !== undefined && (
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
    <p className="text-2xl font-bold text-gray-900 tabular-nums">
      {typeof value === 'number' ? value.toLocaleString() : value}
    </p>
    <p className="text-sm text-gray-400 mt-1">{title}</p>
    {trend !== undefined && <p className="text-[11px] text-gray-300 mt-0.5">vs. last month</p>}
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
      const allOrders: Order[] = ensureArray(response.data);

      const assigned = allOrders.filter((order: Order) => {
        const isAssignedToMe = order.agentId === user?.id || order.agent?.id === user?.id;
        return isAssignedToMe;
      });

      setAssignedOrders(assigned);

      const activeDeliveries = assigned.filter((o) => o.status === 'picked_up').length;
      const completedToday = assigned.filter((o) => o.status === 'delivered').length;
      const totalEarnings = assigned
        .filter((o) => o.status === 'delivered')
        .reduce((sum, o) => sum + Number(o.deliveryFee || 50), 0);
      const totalDeliveries = assigned.filter((o) => o.status === 'delivered').length;

      setStats((prev) => ({
        ...prev,
        activeDeliveries,
        completedToday,
        totalEarnings,
        totalDeliveries,
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
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl border border-gray-100" />
          ))}
        </div>
        <div className="h-80 bg-gray-100 rounded-2xl border border-gray-100" />
      </div>
    );
  }

  const secondaryTiles = [
    { label: 'Total Deliveries', value: stats.totalDeliveries, accent: 'text-gray-900' },
    { label: 'On-Time Rate', value: `${stats.onTimeDelivery}%`, accent: 'text-emerald-600' },
    { label: 'Acceptance Rate', value: '94%', accent: 'text-gray-900' },
    {
      label: 'Avg per Delivery',
      value: `৳${stats.totalDeliveries ? Math.round(stats.totalEarnings / stats.totalDeliveries) : 0}`,
      accent: 'text-gray-900',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.fullName?.split(' ')[0] || 'Agent'}</p>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Active Deliveries" value={stats.activeDeliveries} icon={Navigation} tint="bg-orange-50 text-orange-600" />
        <StatCard title="Completed Today" value={stats.completedToday} icon={CheckCircle} tint="bg-emerald-50 text-emerald-600" />
        <StatCard
          title="Total Earnings"
          value={`৳${stats.totalEarnings}`}
          icon={DollarSign}
          trend={stats.earningsGrowth}
          tint="bg-blue-50 text-blue-600"
        />
        <StatCard title="Rating" value={stats.rating} icon={Star} tint="bg-purple-50 text-purple-600" />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {secondaryTiles.map((tile) => (
          <div key={tile.label} className="bg-white rounded-xl border border-gray-100 shadow-sm shadow-black/2 p-3.5">
            <p className="text-xs text-gray-400">{tile.label}</p>
            <p className={`text-xl font-bold tabular-nums mt-0.5 ${tile.accent}`}>{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-6">
        <h3 className="font-semibold text-gray-800 mb-4">Earnings Overview (Last 7 Days)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={earningsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 13 }} />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="earnings" stroke="#f97316" strokeWidth={2.5} dot={false} name="Earnings (৳)" />
            <Line yAxisId="right" type="monotone" dataKey="deliveries" stroke="#3b82f6" strokeWidth={2.5} dot={false} name="Deliveries" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}