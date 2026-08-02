'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Order } from '@/types';
import { unwrapPaginated } from '@/lib/unwrapPaginated';
import { StatCard } from '@/components/StatCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import { Package, Truck, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';

export default function AgentDashboardPage() {
  const [stats, setStats] = useState({
    available: 0,
    active: 0,
    delivered: 0,
    pending: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  async function fetchDashboard() {
    try {
      setLoading(true);
      const currentUser = auth.getCurrentUser();
      if (!currentUser?.id) return;

      const agentId = currentUser.id;

      const [availableRes, myOrdersRes] = await Promise.all([
        api.get('/orders/available'),
        api.get('/orders/agent/my'),
      ]);

      const available = unwrapPaginated(availableRes.data).items;
      const myOrders = unwrapPaginated(myOrdersRes.data).items;

      const active = myOrders.filter(
        (o: any) =>
          (o.agentId === agentId || o.agent?.id === agentId) &&
          ['picked_up', 'on_the_way'].includes(o.status)
      );

      const delivered = myOrders.filter(
        (o: any) =>
          (o.agentId === agentId || o.agent?.id === agentId) &&
          o.status === 'delivered'
      );

      const pending = myOrders.filter(
        (o: any) =>
          (o.agentId === agentId || o.agent?.id === agentId) &&
          (o.status === 'assigned' || o.status === 'ready')
      );

      setStats({
        available: available.length,
        active: active.length,
        delivered: delivered.length,
        pending: pending.length,
      });

      setRecentOrders(
        [...myOrders]
          .sort(
            (a: any, b: any) =>
              new Date(b.updatedAt || b.placedAt).getTime() -
              new Date(a.updatedAt || a.placedAt).getTime()
          )
          .slice(0, 8) as Order[]
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Agent Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Available Orders" value={stats.available} icon={Package} />
        <StatCard title="Active Deliveries" value={stats.active} icon={Truck} />
        <StatCard title="Pending Pickup" value={stats.pending} icon={Clock} />
        <StatCard title="Delivered" value={stats.delivered} icon={CheckCircle} />
      </div>

      <div className="flex gap-3 mb-6">
        <Link
          href="/agent/available"
          className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
        >
          View Available
        </Link>
        <Link
          href="/agent/deliveries"
          className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900"
        >
          My Deliveries
        </Link>
        <Link
          href="/agent/earnings"
          className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          Earnings
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b font-semibold">Recent Orders</div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-4">Order</th>
              <th className="text-left p-4">Restaurant</th>
              <th className="text-left p-4">Status</th>
              <th className="text-left p-4">Updated</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  No orders yet
                </td>
              </tr>
            ) : (
              recentOrders.map((order: any) => (
                <tr key={order.id} className="border-t">
                  <td className="p-4 font-mono text-xs">#{order.id?.slice(0, 8)}</td>
                  <td className="p-4">{order.restaurant?.name || '—'}</td>
                  <td className="p-4 capitalize">{order.status?.replace(/_/g, ' ')}</td>
                  <td className="p-4">
                    {order.updatedAt
                      ? new Date(order.updatedAt).toLocaleString()
                      : '—'}
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