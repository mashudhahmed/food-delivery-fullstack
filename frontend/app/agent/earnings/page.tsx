'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { api } from '@/lib/api';
import { Order } from '@/app/types';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  Download,
  Eye,
  CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function AgentEarningsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [deliveredOrders, setDeliveredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('week');

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
    fetchEarnings();
  }, []);

  const fetchEarnings = async () => {
    try {
      const response = await api.get('/orders/my');
      const allOrders: Order[] = response.data || [];
      
      const delivered = allOrders.filter((order: Order) => {
        const isAssignedToMe = order.agentId === user?.id || order.agent?.id === user?.id;
        return isAssignedToMe && order.status === 'delivered';
      });
      
      setDeliveredOrders(delivered);
    } catch (error) {
      toast.error('Failed to load earnings data');
    } finally {
      setLoading(false);
    }
  };

  const totalEarnings = deliveredOrders.reduce((sum, o) => sum + (o.deliveryFee || 50), 0);
  const totalDeliveries = deliveredOrders.length;
  const avgPerDelivery = totalDeliveries ? Math.round(totalEarnings / totalDeliveries) : 0;

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Earnings</h1>
          <p className="text-sm text-gray-500 mt-1">Track your delivery earnings</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition">
          <Download className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">Export Report</span>
        </button>
      </div>

      {/* Earnings Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-linear-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Total Earnings</p>
              <p className="text-3xl font-bold mt-1">৳{totalEarnings}</p>
            </div>
            <DollarSign className="w-12 h-12 text-white/30" />
          </div>
        </div>
        <div className="bg-linear-to-r from-blue-500 to-cyan-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Total Deliveries</p>
              <p className="text-3xl font-bold mt-1">{totalDeliveries}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-white/30" />
          </div>
        </div>
        <div className="bg-linear-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Average per Delivery</p>
              <p className="text-3xl font-bold mt-1">৳{avgPerDelivery}</p>
            </div>
            <DollarSign className="w-12 h-12 text-white/30" />
          </div>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2 mb-6">
        {['week', 'month', 'year'].map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedPeriod === period
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      {/* Earnings Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
        <h3 className="font-semibold text-gray-800 mb-4">Earnings Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={earningsData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="earnings" fill="#f97316" name="Earnings (৳)" />
            <Bar yAxisId="right" dataKey="deliveries" fill="#3b82f6" name="Deliveries" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Earnings History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Earnings History</h3>
          <p className="text-sm text-gray-500 mt-1">Recent delivery earnings</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Delivery Fee</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {deliveredOrders.slice(0, 10).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    #{order.id.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {order.restaurant?.name || 'Restaurant'}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-green-600">
                    ৳{order.deliveryFee || 50}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="w-3 h-3" />
                      Completed
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => router.push(`/orders/${order.id}`)}
                      className="text-xs border border-gray-200 px-3 py-1 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {deliveredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    No earnings yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}