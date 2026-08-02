'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Order } from '@/types';
import { unwrapPaginated } from '@/lib/unwrapPaginated';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import toast from 'react-hot-toast';

const STATUS_FLOW: Record<string, string> = {
  assigned: 'picked_up',
  ready: 'picked_up',
  picked_up: 'on_the_way',
  on_the_way: 'delivered',
};

export default function AgentDeliveriesPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMyDeliveries();
  }, []);

  async function fetchMyDeliveries() {
    try {
      setLoading(true);
      const currentUser = auth.getCurrentUser();
      if (!currentUser?.id) return;

      const agentId = currentUser.id;
      const res = await api.get('/orders/agent/my');
      const all = unwrapPaginated(res.data).items;

      const mine = all.filter(
        (o: any) => o.agentId === agentId || o.agent?.id === agentId
      );

      setOrders(
        mine.sort(
          (a: any, b: any) =>
            new Date(b.updatedAt || b.placedAt).getTime() -
            new Date(a.updatedAt || a.placedAt).getTime()
        ) as Order[]
      );
    } catch (err) {
      console.error(err);
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(orderId: string, currentStatus: string) {
    const next = STATUS_FLOW[currentStatus];
    if (!next) return;

    try {
      setUpdatingId(orderId);
      await api.patch(`/orders/${orderId}/status`, { status: next });
      toast.success(`Status updated to ${next.replace(/_/g, ' ')}`);
      fetchMyDeliveries();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Deliveries</h1>
        <button
          onClick={fetchMyDeliveries}
          className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No deliveries assigned yet
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => {
            const nextStatus = STATUS_FLOW[order.status];
            return (
              <div
                key={order.id}
                className="bg-white border rounded-xl p-5 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-lg">
                      {order.restaurant?.name || 'Restaurant'}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {order.deliveryAddress || '—'}
                    </div>
                    <div className="text-xs text-gray-500 font-mono mt-1">
                      #{order.id?.slice(0, 8)} •{' '}
                      <span className="capitalize">
                        {order.status?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  {nextStatus && (
                    <button
                      onClick={() => updateStatus(order.id, order.status)}
                      disabled={updatingId === order.id}
                      className="px-5 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-60"
                    >
                      {updatingId === order.id
                        ? 'Updating...'
                        : `Mark as ${nextStatus.replace(/_/g, ' ')}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}