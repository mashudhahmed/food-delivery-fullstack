'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/api';
import { api } from '@/lib/api';
import { 
  Package, 
  Search,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Truck
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  placedAt: string;
  deliveryAddress: string;
  customerName?: string;
  restaurant?: { id: string; name: string };
  items?: any[];
}

export default function OwnerOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantIdParam = searchParams.get('restaurant');
  
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser || currentUser.role !== 'owner') {
      router.push('/');
      return;
    }
    setUser(currentUser);
    fetchData();
  }, []);

  useEffect(() => {
    if (restaurantIdParam && restaurants.length > 0) {
      setSelectedRestaurant(restaurantIdParam);
    }
  }, [restaurantIdParam, restaurants]);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchOrders();
    }
  }, [selectedRestaurant]);

  const fetchData = async () => {
    try {
      const currentUser = auth.getCurrentUser();
      const restaurantsRes = await api.get(`/restaurants?ownerId=${currentUser?.id}`);
      const ownerRestaurants = restaurantsRes.data || [];
      setRestaurants(ownerRestaurants);
      if (ownerRestaurants.length > 0 && !selectedRestaurant) {
        setSelectedRestaurant(ownerRestaurants[0].id);
      }
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      let allOrders: Order[] = [];
      try {
        const ordersRes = await api.get('/orders/my-restaurant');
        allOrders = ordersRes.data || [];
      } catch (err) {
        const allOrdersRes = await api.get('/orders');
        const allOrdersData = allOrdersRes.data || [];
        const restaurantIds = restaurants.map(r => r.id);
        allOrders = allOrdersData.filter((order: Order) => 
          restaurantIds.includes(order.restaurant?.id || '')
        );
      }
      
      if (selectedRestaurant) {
        allOrders = allOrders.filter(order => order.restaurant?.id === selectedRestaurant);
      }
      
      setOrders(allOrders);
    } catch (error) {
      toast.error('Failed to load orders');
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success(`Order status updated to ${status}`);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; text: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-3 h-3" />, text: 'Pending' },
      preparing: { color: 'bg-blue-100 text-blue-800', icon: <Package className="w-3 h-3" />, text: 'Preparing' },
      ready: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" />, text: 'Ready' },
      picked_up: { color: 'bg-purple-100 text-purple-800', icon: <Truck className="w-3 h-3" />, text: 'Picked Up' },
      delivered: { color: 'bg-gray-100 text-gray-800', icon: <CheckCircle className="w-3 h-3" />, text: 'Delivered' },
      cancelled: { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-3 h-3" />, text: 'Cancelled' },
    };
    return badges[status] || badges.pending;
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    pending: orders.filter(o => o.status === 'pending').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
        <p className="text-sm text-gray-500 mt-1">Track and manage customer orders</p>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {restaurants.map((restaurant) => (
          <button
            key={restaurant.id}
            onClick={() => setSelectedRestaurant(restaurant.id)}
            className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
              selectedRestaurant === restaurant.id
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {restaurant.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'all', label: 'All', count: orders.length },
          { id: 'pending', label: 'Pending', count: statusCounts.pending, color: 'bg-yellow-100 text-yellow-800' },
          { id: 'preparing', label: 'Preparing', count: statusCounts.preparing, color: 'bg-blue-100 text-blue-800' },
          { id: 'ready', label: 'Ready', count: statusCounts.ready, color: 'bg-green-100 text-green-800' },
          { id: 'delivered', label: 'Delivered', count: statusCounts.delivered, color: 'bg-gray-100 text-gray-800' },
          { id: 'cancelled', label: 'Cancelled', count: statusCounts.cancelled, color: 'bg-red-100 text-red-800' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              statusFilter === tab.id
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              statusFilter === tab.id ? 'bg-white/20 text-white' : tab.color || 'bg-gray-200 text-gray-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by order ID or customer name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Placed At</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.map((order) => {
                const statusInfo = getStatusBadge(order.status);
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      #{order.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.customerName || 'Customer'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-orange-600">
                      ৳{order.totalAmount}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.icon}
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {order.placedAt ? new Date(order.placedAt).toLocaleString() : 'Just now'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                            disabled={updatingId === order.id}
                            className="text-xs bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                          >
                            {updatingId === order.id ? '...' : 'Accept'}
                          </button>
                        )}
                        {order.status === 'preparing' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                            disabled={updatingId === order.id}
                            className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 disabled:opacity-50"
                          >
                            {updatingId === order.id ? '...' : 'Ready'}
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/orders/${order.id}`)}
                          className="text-xs border border-gray-200 px-3 py-1 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    No orders found
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