'use client';

import { JSX, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { api } from '@/lib/api';
import { Order, OrderStatus } from '@/types';
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
  Eye,
  RefreshCw,
  ChevronRight,
  Star,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// Helper function to format currency safely
const formatCurrency = (amount: number | string | undefined): string => {
  if (amount === undefined || amount === null) return '0';
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0';
  return Math.round(numAmount).toLocaleString();
};

// Get progress percentage based on status for agent view
const getProgressPercentage = (status: OrderStatus): number => {
  const progressMap: Record<OrderStatus, number> = {
    pending: 0,
    preparing: 0,
    ready: 33,
    picked_up: 66,
    on_the_way: 66,
    delivered: 100,
    cancelled: 0,
  };
  return progressMap[status] || 0;
};

export default function AgentDeliveriesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [assignedOrders, setAssignedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchDeliveries = useCallback(async (showToast = false) => {
    try {
      const response = await api.get('/orders');
      const allOrders: Order[] = response.data || [];
      
      const assigned = allOrders.filter((order: Order) => 
        order.agentId === user?.id
      );
      
      setAssignedOrders(assigned);
      setLastUpdated(new Date());
      
      if (showToast && assigned.length > 0) {
        const activeCount = assigned.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
        if (activeCount > 0) {
          toast.success(`${activeCount} active delivery${activeCount > 1 ? 's' : ''}`);
        }
      }
    } catch (error) {
      console.error('Failed to fetch deliveries:', error);
      if (showToast) {
        toast.error('Failed to load deliveries');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser || currentUser.role !== 'agent') {
      router.push('/');
      return;
    }
    setUser(currentUser);
    fetchDeliveries();
    
    const interval = setInterval(() => {
      fetchDeliveries();
    }, 15000);
    
    const handleFocus = () => {
      fetchDeliveries();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchDeliveries, router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDeliveries(true);
  };

  const updateDeliveryStatus = async (orderId: string, status: 'picked_up' | 'delivered') => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/delivery`, { status });
      
      if (status === 'picked_up') {
        toast.success('Order picked up! Ready to deliver', {
          icon: '📦',
          duration: 3000,
        });
      } else if (status === 'delivered') {
        toast.success('Order delivered! Earnings added', {
          icon: '💰',
          duration: 3000,
        });
      }
      
      await fetchDeliveries();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusInfo = (status: OrderStatus) => {
    const statusMap: Record<OrderStatus, { color: string; text: string; icon: JSX.Element }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending', icon: <Clock className="w-4 h-4" /> },
      preparing: { color: 'bg-purple-100 text-purple-800', text: 'Preparing', icon: <Package className="w-4 h-4" /> },
      ready: { color: 'bg-green-100 text-green-800', text: 'Ready for Pickup', icon: <Package className="w-4 h-4" /> },
      picked_up: { color: 'bg-blue-100 text-blue-800', text: 'Picked Up', icon: <Truck className="w-4 h-4" /> },
      on_the_way: { color: 'bg-indigo-100 text-indigo-800', text: 'On the Way', icon: <Navigation className="w-4 h-4" /> },
      delivered: { color: 'bg-gray-100 text-gray-800', text: 'Delivered', icon: <CheckCircle className="w-4 h-4" /> },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelled', icon: <XCircle className="w-4 h-4" /> },
    };
    return statusMap[status] || statusMap.pending;
  };

  const formatDeliveryTime = (date: Date | string | undefined): string => {
    if (!date) return 'Just now';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Just now';
    
    const minutes = Math.floor((new Date().getTime() - dateObj.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    if (minutes < 60) return `${minutes} mins ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
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
    ready: assignedOrders.filter(o => o.status === 'ready').length,
    picked_up: assignedOrders.filter(o => o.status === 'picked_up').length,
    on_the_way: assignedOrders.filter(o => o.status === 'on_the_way').length,
    delivered: assignedOrders.filter(o => o.status === 'delivered').length,
    totalEarnings: assignedOrders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (typeof o.deliveryFee === 'number' ? o.deliveryFee : 50), 0),
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Deliveries</h1>
          <p className="text-sm text-gray-500 mt-1">
            Track and manage your deliveries • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="text-sm text-gray-600">Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-linear-to-r from-blue-500 to-cyan-500 rounded-xl p-4 text-white">
          <p className="text-white/80 text-xs">Active Deliveries</p>
          <p className="text-2xl font-bold">{statusCounts.ready + statusCounts.picked_up + statusCounts.on_the_way}</p>
        </div>
        <div className="bg-linear-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white">
          <p className="text-white/80 text-xs">Completed</p>
          <p className="text-2xl font-bold">{statusCounts.delivered}</p>
        </div>
        <div className="bg-linear-to-r from-orange-500 to-red-500 rounded-xl p-4 text-white">
          <p className="text-white/80 text-xs">Total Earnings</p>
          <p className="text-2xl font-bold">৳{formatCurrency(statusCounts.totalEarnings)}</p>
        </div>
        <div className="bg-linear-to-r from-purple-500 to-pink-500 rounded-xl p-4 text-white">
          <p className="text-white/80 text-xs">Rating</p>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold">4.9</span>
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          </div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'all'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All Orders
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {statusCounts.all}
          </span>
        </button>
        <button
          onClick={() => setStatusFilter('ready')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'ready'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Ready to Pickup
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            statusFilter === 'ready' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {statusCounts.ready}
          </span>
        </button>
        <button
          onClick={() => setStatusFilter('picked_up')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'picked_up'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Picked Up
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            statusFilter === 'picked_up' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {statusCounts.picked_up}
          </span>
        </button>
        <button
          onClick={() => setStatusFilter('on_the_way')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'on_the_way'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          On the Way
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            statusFilter === 'on_the_way' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {statusCounts.on_the_way}
          </span>
        </button>
        <button
          onClick={() => setStatusFilter('delivered')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            statusFilter === 'delivered'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Completed
          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
            statusFilter === 'delivered' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {statusCounts.delivered}
          </span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by order ID, restaurant, or address..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />
      </div>

      {/* Deliveries Cards */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">No deliveries found</h3>
          <p className="text-gray-500">
            {assignedOrders.length === 0 
              ? 'You haven\'t accepted any deliveries yet' 
              : 'No deliveries match your filters'}
          </p>
          {assignedOrders.length === 0 && (
            <button
              onClick={() => router.push('/agent/available')}
              className="mt-4 bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600 transition font-medium inline-flex items-center gap-2"
            >
              Browse Available Orders
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            const earnings = typeof order.deliveryFee === 'number' ? order.deliveryFee : 50;
            const progressPercentage = getProgressPercentage(order.status);
            
            return (
              <div 
                key={order.id} 
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200"
              >
                <div className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    {/* Left Section */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className="font-bold text-gray-800 text-lg">
                          #{order.id.slice(-8).toUpperCase()}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.icon}
                          {statusInfo.text}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDeliveryTime(order.updatedAt)}
                        </span>
                      </div>
                      
                      {/* Progress Bar - Agent View */}
                      {(order.status === 'ready' || order.status === 'picked_up' || order.status === 'delivered') && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span className={order.status === 'ready' ? 'font-bold text-orange-500' : ''}>Pick up</span>
                            <span className={order.status === 'picked_up' ? 'font-bold text-orange-500' : ''}>Picked Up</span>
                            <span>On the Way</span>
                            <span>Deliver</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full transition-all duration-500 bg-orange-500"
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Restaurant & Delivery Info */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                          <Truck className="w-4 h-4 text-orange-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500">Pick up from</p>
                            <p className="font-medium text-gray-800 text-sm">{order.restaurant?.name || 'Restaurant'}</p>
                            <p className="text-xs text-gray-400">{order.restaurant?.address?.split(',')[0]}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                          <MapPin className="w-4 h-4 text-blue-500 mt-0.5" />
                          <div>
                            <p className="text-xs text-gray-500">Deliver to</p>
                            <p className="font-medium text-gray-800 text-sm">{order.customerName || 'Customer'}</p>
                            <p className="text-xs text-gray-400">{order.deliveryAddress?.split(',')[0]}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Order Stats */}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">{order.items?.length || 0} items</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-orange-400" />
                          <span className="text-gray-600">Total: ৳{formatCurrency(order.totalAmount)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-green-500" />
                          <span className="text-green-600 font-medium">Earn: ৳{formatCurrency(earnings)}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-row lg:flex-col gap-2 min-w-40">
                      {/* Show "Mark as Picked Up" only for ready orders */}
                      {order.status === 'ready' && (
                        <button
                          onClick={() => updateDeliveryStatus(order.id, 'picked_up')}
                          disabled={updatingId === order.id}
                          className="w-full bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition font-medium flex items-center justify-center gap-2 text-sm"
                        >
                          <Package className="w-4 h-4" />
                          {updatingId === order.id ? 'Processing...' : 'Mark as Picked Up'}
                        </button>
                      )}
                      
                      {/* Show "Mark as Delivered" only for picked_up orders */}
                      {order.status === 'picked_up' && (
                        <button
                          onClick={() => updateDeliveryStatus(order.id, 'delivered')}
                          disabled={updatingId === order.id}
                          className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition font-medium flex items-center justify-center gap-2 text-sm"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {updatingId === order.id ? 'Processing...' : 'Mark as Delivered'}
                        </button>
                      )}
                      
                      {/* Show status message for on_the_way */}
                      {order.status === 'on_the_way' && (
                        <div className="w-full bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-center font-medium text-sm flex items-center justify-center gap-2">
                          <Navigation className="w-4 h-4 animate-pulse" />
                          On the Way to Customer
                        </div>
                      )}
                      
                      {/* Show completed badge for delivered */}
                      {order.status === 'delivered' && (
                        <div className="w-full bg-gray-100 text-gray-500 px-4 py-2 rounded-lg text-center font-medium text-sm">
                          ✓ Completed
                        </div>
                      )}
                      
                      <button
                        onClick={() => router.push(`/orders/${order.id}`)}
                        className="w-full border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}