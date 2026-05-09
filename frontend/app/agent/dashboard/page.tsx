'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/app/lib/api';
import { api } from '@/app/lib/api';
import { Order } from '@/app/types';
import { Package, MapPin, CheckCircle, Navigation } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AgentDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'assigned' | 'available'>('assigned');

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    
    if (currentUser.role !== 'agent') {
      router.push('/');
      return;
    }
    
    setUser(currentUser);
    fetchAgentData();
  }, []);

  const fetchAgentData = async () => {
    try {
      const [assignedRes, availableRes] = await Promise.all([
        api.get('/orders/assigned-to-me'),
        api.get('/orders/ready-for-assignment'),
      ]);
      setAssignedOrders(assignedRes.data);
      setAvailableOrders(availableRes.data);
    } catch (error) {
      console.error('Failed to fetch agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDeliveryStatus = async (orderId: string, status: 'picked_up' | 'delivered') => {
    try {
      await api.patch(`/orders/${orderId}/delivery`, { status });
      toast.success(`Order ${status === 'picked_up' ? 'picked up' : 'delivered'} successfully`);
      fetchAgentData();
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const acceptOrder = async (orderId: string) => {
    try {
      await api.patch(`/orders/${orderId}/assign`, { agentId: user?.id });
      toast.success('Order accepted successfully');
      fetchAgentData();
    } catch (error) {
      toast.error('Failed to accept order');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      ready: 'bg-green-100 text-green-800',
      picked_up: 'bg-blue-100 text-blue-800',
      delivered: 'bg-gray-100 text-gray-800',
    };
    return badges[status] || 'bg-yellow-100 text-yellow-800';
  };

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Delivery Agent Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.fullName}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Active Deliveries</p>
              <p className="text-2xl font-bold">
                {assignedOrders.filter(o => o.status === 'picked_up').length}
              </p>
            </div>
            <Navigation className="w-10 h-10 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Completed Today</p>
              <p className="text-2xl font-bold">
                {assignedOrders.filter(o => o.status === 'delivered').length}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Available Orders</p>
              <p className="text-2xl font-bold">{availableOrders.length}</p>
            </div>
            <Package className="w-10 h-10 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('assigned')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'assigned'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          My Deliveries ({assignedOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('available')}
          className={`px-4 py-2 font-medium transition ${
            activeTab === 'available'
              ? 'text-orange-500 border-b-2 border-orange-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Available Orders ({availableOrders.length})
        </button>
      </div>

      {/* Assigned Orders Tab */}
      {activeTab === 'assigned' && (
        <div className="space-y-4">
          {assignedOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No assigned deliveries</p>
            </div>
          ) : (
            assignedOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-gray-800">
                        Order #{order.id.slice(-8).toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                        {order.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-gray-600">
                      <span className="font-medium">Restaurant:</span> {order.restaurant?.name || 'Restaurant'}
                    </p>
                    <div className="flex items-start gap-2 mt-2 text-gray-600">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <p className="text-sm">{order.deliveryAddress}</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Total: ৳{order.totalAmount}
                    </p>
                  </div>
                  <div className="text-right">
                    {order.status === 'ready' && (
                      <button
                        onClick={() => updateDeliveryStatus(order.id, 'picked_up')}
                        className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition"
                      >
                        Mark as Picked Up
                      </button>
                    )}
                    {order.status === 'picked_up' && (
                      <button
                        onClick={() => updateDeliveryStatus(order.id, 'delivered')}
                        className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
                      >
                        Mark as Delivered
                      </button>
                    )}
                    {order.status === 'delivered' && (
                      <span className="text-green-600 font-medium">✓ Delivered</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Available Orders Tab */}
      {activeTab === 'available' && (
        <div className="space-y-4">
          {availableOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No orders available for delivery</p>
            </div>
          ) : (
            availableOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-md p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-gray-800">
                        Order #{order.id.slice(-8).toUpperCase()}
                      </span>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                        Ready for Pickup
                      </span>
                    </div>
                    <p className="text-gray-600">
                      <span className="font-medium">Restaurant:</span> {order.restaurant?.name || 'Restaurant'}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Restaurant Address:</span> {order.restaurant?.address || 'Address not available'}
                    </p>
                    <div className="flex items-start gap-2 mt-2 text-gray-600">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <p className="text-sm">{order.deliveryAddress}</p>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      Total: ৳{order.totalAmount} | Items: {order.items?.length || 0}
                    </p>
                  </div>
                  <button
                    onClick={() => acceptOrder(order.id)}
                    className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition"
                  >
                    Accept Delivery
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}