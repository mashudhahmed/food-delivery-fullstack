'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { api } from '@/lib/api';
import { Order } from '@/app/types';
import { 
  Package, 
  MapPin, 
  Navigation, 
  Clock, 
  DollarSign,
  Truck,
  Search,
  Eye,
  RefreshCw,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AgentAvailablePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchAvailableOrders = useCallback(async (showToast = false) => {
    try {
      const response = await api.get('/orders');
      const allOrders: Order[] = response.data || [];
      
      const available = allOrders.filter((order: Order) => 
        order.status === 'ready' && !order.agentId
      );
      
      setAvailableOrders(available);
      setLastUpdated(new Date());
      
      if (showToast && available.length > 0) {
        toast.success(`${available.length} new order${available.length > 1 ? 's' : ''} available`);
      }
    } catch (error) {
      console.error('Failed to fetch available orders:', error);
      if (showToast) {
        toast.error('Failed to load orders');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser || currentUser.role !== 'agent') {
      router.push('/');
      return;
    }
    setUser(currentUser);
    fetchAvailableOrders();
    
    // Auto-refresh every 15 seconds (industry standard)
    const interval = setInterval(() => {
      fetchAvailableOrders();
    }, 15000);
    
    // Refresh when tab gets focus
    const handleFocus = () => {
      fetchAvailableOrders();
    };
    window.addEventListener('focus', handleFocus);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchAvailableOrders, router]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAvailableOrders(true);
  };

  const acceptOrder = async (orderId: string) => {
    setAcceptingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/assign`, { agentId: user?.id });
      toast.success('Order accepted! Head to restaurant', {
        icon: '✅',
        duration: 3000,
      });
      await fetchAvailableOrders();
      router.push('/agent/deliveries');
    } catch (error: any) {
      console.error('Accept failed:', error);
      toast.error(error.response?.data?.message || 'Failed to accept order');
    } finally {
      setAcceptingId(null);
    }
  };

  const formatDistance = (): string => {
    // Simulate distance - in production, calculate from backend
    const distances = ['0.8 km', '1.2 km', '1.5 km', '2.0 km', '2.3 km'];
    return distances[Math.floor(Math.random() * distances.length)];
  };

  const formatReadyTime = (date: Date | string | undefined): string => {
    if (!date) return 'Just now';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(dateObj.getTime())) return 'Just now';
    
    const minutes = Math.floor((new Date().getTime() - dateObj.getTime()) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 min ago';
    return `${minutes} mins ago`;
  };

  const filteredOrders = availableOrders.filter(order => {
    const term = searchTerm.toLowerCase();
    return order.id.toLowerCase().includes(term) ||
      (order.restaurant?.name?.toLowerCase() || '').includes(term) ||
      (order.deliveryAddress?.toLowerCase() || '').includes(term);
  });

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
          <h1 className="text-2xl font-bold text-gray-800">Available Orders</h1>
          <p className="text-sm text-gray-500 mt-1">
            Orders ready for pickup • Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="text-sm text-gray-600">Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-linear-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">Available Orders</p>
              <p className="text-3xl font-bold mt-1">{availableOrders.length}</p>
            </div>
            <Package className="w-10 h-10 text-white/30" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500 text-sm">Avg Delivery Fee</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">৳50</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500 text-sm">Potential Earnings</p>
          <p className="text-2xl font-bold text-green-600 mt-1">৳{availableOrders.length * 50}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <p className="text-gray-500 text-sm">Active Agents</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">12</p>
        </div>
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

      {/* Orders Cards - Industry Standard Card Layout */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">No available orders</h3>
          <p className="text-gray-500">Check back later for new delivery opportunities</p>
          <button
            onClick={handleRefresh}
            className="mt-4 text-orange-500 hover:text-orange-600 font-medium inline-flex items-center gap-1"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div 
              key={order.id} 
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-200 group"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  {/* Left Section */}
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-3">
                      <span className="font-bold text-gray-800 text-lg">
                        #{order.id.slice(-8).toUpperCase()}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Clock className="w-3 h-3" />
                        Ready for Pickup
                      </span>
                      <span className="text-sm text-gray-400">
                        {formatReadyTime(order.updatedAt)}
                      </span>
                    </div>
                    
                    {/* Restaurant Card */}
                    <div className="flex items-start gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                        <Truck className="w-6 h-6 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Pick up from</p>
                        <p className="font-semibold text-gray-900">{order.restaurant?.name || 'Restaurant'}</p>
                        <p className="text-sm text-gray-500">{order.restaurant?.address?.split(',')[0] || 'Address not available'}</p>
                      </div>
                    </div>
                    
                    {/* Delivery Address */}
                    <div className="flex items-start gap-3 mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-blue-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">Deliver to</p>
                        <p className="font-semibold text-gray-900">{order.deliveryAddress.split(',')[0]}</p>
                        <p className="text-sm text-gray-500">{order.deliveryAddress}</p>
                      </div>
                    </div>
                    
                    {/* Order Stats */}
                    <div className="flex flex-wrap gap-6 text-sm">
                      <div>
                        <span className="text-gray-500">Items:</span>
                        <span className="font-medium text-gray-800 ml-1">{order.items?.length || 0}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Total:</span>
                        <span className="font-medium text-orange-600 ml-1">৳{order.totalAmount}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Distance:</span>
                        <span className="font-medium text-gray-800 ml-1">{formatDistance()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Your Earnings:</span>
                        <span className="font-medium text-green-600 ml-1">৳{order.deliveryFee || 50}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Section - Action Button */}
                  <div className="flex flex-row lg:flex-col gap-3 min-w-48">
                    <button
                      onClick={() => acceptOrder(order.id)}
                      disabled={acceptingId === order.id}
                      className="w-full bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition font-semibold flex items-center justify-center gap-2 group-hover:shadow-lg disabled:opacity-50"
                    >
                      <Navigation className="w-5 h-5" />
                      {acceptingId === order.id ? 'Accepting...' : 'Accept Delivery'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
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
          ))}
        </div>
      )}
    </div>
  );
}