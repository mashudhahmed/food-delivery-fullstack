'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { Order } from '@/types';
import { unwrapPaginated } from '@/lib/unwrapPaginated';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import toast from 'react-hot-toast';
import { MapPin, Package } from 'lucide-react';

export default function AgentAvailablePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailable();
  }, []);

  async function fetchAvailable() {
    try {
      setLoading(true);
      const currentUser = auth.getCurrentUser();
      if (!currentUser?.id) return;

      const res = await api.get('/orders/available');
      setOrders(unwrapPaginated(res.data).items as Order[]);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load available orders');
    } finally {
      setLoading(false);
    }
  }

  async function acceptOrder(orderId: string) {
    try {
      setAcceptingId(orderId);
      await api.patch(`/orders/${orderId}/accept`);
      toast.success('Order accepted!');
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to accept order');
    } finally {
      setAcceptingId(null);
    }
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Available Orders</h1>
        <button
          onClick={fetchAvailable}
          className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>No available orders right now</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <div
              key={order.id}
              className="bg-white border rounded-xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div>
                <div className="font-semibold text-lg mb-1">
                  {order.restaurant?.name || 'Restaurant'}
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-1 mb-1">
                  <MapPin className="w-4 h-4" />
                  {order.deliveryAddress || '—'}
                </div>
                <div className="text-xs text-gray-500 font-mono">
                  #{order.id?.slice(0, 8)} • ৳
                  {Number(order.totalAmount || order.total || 0).toFixed(0)}
                </div>
              </div>

              <button
                onClick={() => acceptOrder(order.id)}
                disabled={acceptingId === order.id}
                className="px-5 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-60"
              >
                {acceptingId === order.id ? 'Accepting...' : 'Accept Order'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}