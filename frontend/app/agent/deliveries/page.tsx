'use client';

import { JSX, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/app/lib/api';
import { api } from '@/app/lib/api';
import { Order, OrderStatus } from '@/app/types';
import { 
  Package, 
  MapPin, 
  CheckCircle, 
  Navigation, 
  Clock, 
  DollarSign,
  Truck,
  Search,
  Phone,
  User,
  Eye
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AgentDeliveriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser || currentUser.role !== 'agent') {
      router.push('/');
      return;
    }
    setUser(currentUser);
    fetchDeliveries();
  }, []);

  const fetchDeliveries = async () => {
    try {
      const response = await api.get('/orders/my');
      const allOrders: Order[] = response.data || [];
      
      const assigned = allOrders.filter((order: Order) => {
        const isAssignedToMe = order.agentId === user?.id || order.agent?.id === user?.id;
        return isAssignedToMe;
      });
      
      setAssignedOrders(assigned);
    } catch (error) {
      toast.error('Failed to load deliveries');
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryStatus = async (orderId: string, status: 'picked_up' | 'delivered') => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/delivery`, { status });
      toast.success(`Order ${status === 'picked_up' ? 'picked up' : 'delivered'} successfully`);
      fetchDeliveries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    const badges: Record<OrderStatus, { color: string; text: string; icon: JSX.Element }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending', icon: <Clock className="w-3 h-3" /> },
      preparing: { color: 'bg-purple-100 text-purple-800', text: 'Preparing', icon: <Package className="w-3 h-3" /> },
      ready: { color: 'bg-green-100 text-green-800', text: 'Ready for Pickup', icon: <Package className="w-3 h-3" /> },
      picked_up: { color: 'bg-blue-100 text-blue-800', text: 'On Delivery', icon: <Navigation className="w-3 h-3" /> },
      delivered: { color: 'bg-gray-100 text-gray-800', text: 'Delivered', icon: <CheckCircle className="w-3 h-3" /> },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelled', icon: <CheckCircle className="w-3 h-3" /> },
    };
    return badges[status] || badges.pending;
  };

  const formatDate = (date: Date | string | undefined): string => {
    if (!date) return 'Just now';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Just now';
    return dateObj.toLocaleString();
  };

  const filteredOrders = assignedOrders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.deliveryAddress?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (order.restaurant?.name?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    all: assignedOrders.length,
    pending: assignedOrders.filter(o => o.status === 'pending').length,
    preparing: assignedOrders.filter(o => o.status === 'preparing').length,
    ready: assignedOrders.filter(o => o.status === 'ready').length,
    picked_up: assignedOrders.filter(o => o.status === 'picked_up').length,
    delivered: assignedOrders.filter(o => o.status === 'delivered').length,
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
        <h1 className="text-2xl font-bold text-gray-800">My Deliveries</h1>
        <p className="text-sm text-gray-500 mt-1">Track and manage your assigned deliveries</p>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold">{statusCounts.all}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">On Delivery</p>
          <p className="text-xl font-bold text-blue-600">{statusCounts.picked_up}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Ready</p>
          <p className="text-xl font-bold text-green-600">{statusCounts.ready}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Delivered</p>
          <p className="text-xl font-bold text-gray-600">{statusCounts.delivered}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-xl font-bold text-yellow-600">{statusCounts.pending}</p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { id: 'all', label: 'All', count: statusCounts.all },
          { id: 'pending', label: 'Pending', count: statusCounts.pending },
          { id: 'preparing', label: 'Preparing', count: statusCounts.preparing },
          { id: 'ready', label: 'Ready', count: statusCounts.ready },
          { id: 'picked_up', label: 'On Delivery', count: statusCounts.picked_up },
          { id: 'delivered', label: 'Delivered', count: statusCounts.delivered },
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
              statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by order ID, restaurant, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* Deliveries Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Delivery Address</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Earnings</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
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
                      {order.restaurant?.name || 'Restaurant'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {order.deliveryAddress}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-orange-600">
                      ৳{order.totalAmount}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-green-600">
                      ৳{order.deliveryFee || 50}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.icon}
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {order.status === 'ready' && (
                          <button
                            onClick={() => updateDeliveryStatus(order.id, 'picked_up')}
                            disabled={updatingId === order.id}
                            className="text-xs bg-orange-500 text-white px-3 py-1 rounded-lg hover:bg-orange-600 disabled:opacity-50"
                          >
                            {updatingId === order.id ? '...' : 'Start'}
                          </button>
                        )}
                        {order.status === 'picked_up' && (
                          <button
                            onClick={() => updateDeliveryStatus(order.id, 'delivered')}
                            disabled={updatingId === order.id}
                            className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600 disabled:opacity-50"
                          >
                            {updatingId === order.id ? '...' : 'Complete'}
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
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    No deliveries found
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