'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { api } from '@/lib/api';
import { Order } from '@/types';
import { DollarSign, TrendingUp, Download, Eye, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ✅ Helper to ensure array, in case the API wraps the list in an object
const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.orders && Array.isArray(data.orders)) return data.orders;
  console.warn('⚠️ Unexpected data format for orders:', typeof data, data);
  return [];
};

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
      const allOrders: Order[] = ensureArray(response.data);

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

  const totalEarnings = deliveredOrders.reduce((sum, o) => sum + Number(o.deliveryFee || 50), 0);
  const totalDeliveries = deliveredOrders.length;
  const avgPerDelivery = totalDeliveries ? Math.round(totalEarnings / totalDeliveries) : 0;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-40 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl border border-gray-100" />
          ))}
        </div>
        <div className="h-80 bg-gray-100 rounded-2xl border border-gray-100" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
          <p className="text-sm text-gray-500 mt-1">Track your delivery earnings</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition text-sm font-medium text-gray-600">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      {/* Earnings Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">৳{totalEarnings}</p>
          <p className="text-sm text-gray-400 mt-1">Total Earnings</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600">
              <TrendingUp className="w-5 h-5" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">{totalDeliveries}</p>
          <p className="text-sm text-gray-400 mt-1">Total Deliveries</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-orange-50 text-orange-600">
              <DollarSign className="w-5 h-5" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900 tabular-nums">৳{avgPerDelivery}</p>
          <p className="text-sm text-gray-400 mt-1">Average per Delivery</p>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {['week', 'month', 'year'].map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              selectedPeriod === period ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      {/* Earnings Chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-6 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">Earnings Breakdown</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={earningsData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis yAxisId="left" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f1f5f9', fontSize: 13 }} />
            <Legend />
            <Bar yAxisId="left" dataKey="earnings" fill="#f97316" name="Earnings (৳)" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="deliveries" fill="#3b82f6" name="Deliveries" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Earnings History Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Earnings History</h3>
          <p className="text-sm text-gray-500 mt-1">Recent delivery earnings</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Order</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Restaurant</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Delivery Fee</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deliveredOrders.slice(0, 10).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-800">#{order.id.slice(-8).toUpperCase()}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{order.restaurant?.name || 'Restaurant'}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-emerald-600 tabular-nums">৳{order.deliveryFee || 50}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {order.updatedAt ? new Date(order.updatedAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset bg-emerald-50 text-emerald-700 ring-emerald-200">
                      <CheckCircle className="w-3 h-3" />
                      Completed
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end">
                      <button
                        onClick={() => router.push(`/orders/${order.id}`)}
                        className="text-xs font-medium text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 hover:text-gray-800 flex items-center gap-1.5 transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {deliveredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <DollarSign className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-600">No earnings yet</p>
                    <p className="text-xs text-gray-400 mt-1">Completed deliveries will show up here.</p>
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