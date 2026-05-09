'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/app/lib/api';
import { api } from '@/app/lib/api';
import { Restaurant,Order } from '@/app/types';
import { Store, Package, TrendingUp, Star } from 'lucide-react';
import { toast } from 'react-hot-toast/headless';

export default function OwnerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    
    if (currentUser.role !== 'owner') {
      router.push('/');
      return;
    }
    
    setUser(currentUser);
    fetchOwnerData();
  }, []);

  const fetchOwnerData = async () => {
    try {
      const [restaurantsRes, ordersRes] = await Promise.all([
        api.get('/restaurants?owner=true'),
        api.get('/orders/my-restaurant'),
      ]);
      setRestaurants(restaurantsRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      console.error('Failed to fetch owner data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success(`Order status updated to ${status}`);
      fetchOwnerData();
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Owner Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.fullName}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Restaurants</p>
              <p className="text-2xl font-bold">{restaurants.length}</p>
            </div>
            <Store className="w-10 h-10 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Orders</p>
              <p className="text-2xl font-bold">
                {orders.filter(o => o.status === 'pending').length}
              </p>
            </div>
            <Package className="w-10 h-10 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Orders</p>
              <p className="text-2xl font-bold">{orders.length}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Avg Rating</p>
              <p className="text-2xl font-bold">4.8</p>
            </div>
            <Star className="w-10 h-10 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Orders Section */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
        {orders.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No orders yet</p>
        ) : (
          <div className="space-y-4">
            {orders.slice(0, 10).map((order) => (
              <div key={order.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">Order #{order.id.slice(-8).toUpperCase()}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.placedAt).toLocaleString()}
                    </p>
                    <p className="text-sm mt-1">Total: ৳{order.totalAmount}</p>
                  </div>
                  <div className="text-right">
                    <select
                      value={order.status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'ready' ? 'bg-green-100 text-green-800' :
                        order.status === 'delivered' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}
                    >
                      <option value="pending">Pending</option>
                      <option value="preparing">Preparing</option>
                      <option value="ready">Ready</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}