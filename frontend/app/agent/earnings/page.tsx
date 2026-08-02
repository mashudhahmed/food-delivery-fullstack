'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Order } from '@/types';
import { unwrapPaginated } from '@/lib/unwrapPaginated';
import { StatCard } from '@/components/StatCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { DollarSign, Package, TrendingUp } from 'lucide-react';

export default function AgentEarningsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    fetchEarnings();
  }, []);

  async function fetchEarnings() {
    try {
      setLoading(true);
      const currentUser = auth.getCurrentUser();
      if (!currentUser?.id) return;

      const agentId = currentUser.id;
      const res = await api.get('/orders/agent/my');
      const allOrders = unwrapPaginated(res.data).items;

      const delivered = allOrders.filter((order: any) => {
        const isAssignedToMe =
          order.agentId === agentId || order.agent?.id === agentId;
        return isAssignedToMe && order.status === 'delivered';
      });

      setOrders(delivered as Order[]);

      const earnings = delivered.reduce((sum: number, o: any) => {
        return sum + (Number(o.deliveryFee) || 30);
      }, 0);
      setTotalEarnings(earnings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">My Earnings</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard title="Total Earnings" value={totalEarnings} icon={DollarSign} format="currency" />
        <StatCard title="Delivered Orders" value={orders.length} icon={Package} />
        <StatCard
          title="Avg per Delivery"
          value={orders.length ? Math.round(totalEarnings / orders.length) : 0}
          icon={TrendingUp}
          format="currency"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4">Order ID</th>
              <th className="text-left p-4">Restaurant</th>
              <th className="text-left p-4">Date</th>
              <th className="text-right p-4">Delivery Fee</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  No delivered orders yet
                </td>
              </tr>
            ) : (
              orders.map((order: any) => (
                <tr key={order.id} className="border-t">
                  <td className="p-4 font-mono text-xs">#{order.id?.slice(0, 8)}</td>
                  <td className="p-4">{order.restaurant?.name || '—'}</td>
                  <td className="p-4">
                    {order.updatedAt
                      ? new Date(order.updatedAt).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="p-4 text-right font-medium">
                    ৳{Number(order.deliveryFee || 30).toFixed(0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
