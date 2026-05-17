'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { api } from '@/lib/api';
import { 
  DollarSign, 
  ShoppingBag, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Star,
  Store,
  Package,
  Clock,
  Truck,
  Navigation,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface OwnerStats {
  totalRestaurants: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  preparingOrders: number;
  readyOrders: number;
  pickedUpOrders: number;
  onTheWayOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  avgRating: number;
  revenueGrowth: number;
  orderGrowth: number;
  completionRate: number;
}

// Helper function to safely format numbers
const formatSafeNumber = (value: any): string => {
  if (value === undefined || value === null) return '0';
  
  let numValue: number;
  
  if (typeof value === 'number') {
    numValue = value;
  } else if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.-]/g, '');
    numValue = parseFloat(cleaned);
  } else {
    numValue = 0;
  }
  
  if (isNaN(numValue)) return '0';
  
  return Math.round(numValue).toLocaleString();
};

// Helper function to safely parse amount to number
const parseAmount = (amount: any): number => {
  if (amount === undefined || amount === null) return 0;
  if (typeof amount === 'number') return amount;
  if (typeof amount === 'string') {
    const parsed = parseFloat(amount);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => {
  // Format the display value
  const getDisplayValue = () => {
    if (title === 'Total Revenue') {
      // For revenue, value might already include ৳ symbol
      if (typeof value === 'string' && value.startsWith('৳')) {
        return value;
      }
      return `৳${formatSafeNumber(value)}`;
    }
    if (title === 'Completion Rate' && typeof value === 'string' && value.includes('%')) {
      return value;
    }
    if (title === 'Avg Rating') {
      if (typeof value === 'number') return value.toFixed(1);
      return value;
    }
    return formatSafeNumber(value);
  };

  // Get numeric value for trend calculation
  const getNumericValue = (): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
      return isNaN(num) ? 0 : num;
    }
    return 0;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">
            {getDisplayValue()}
          </p>
          {trend !== undefined && trend !== null && !isNaN(trend) && (
            <div className="flex items-center gap-1 mt-2">
              {trend >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {Math.abs(Math.round(trend * 10) / 10)}% from last month
              </span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
};

export default function OwnerDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OwnerStats>({
    totalRestaurants: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    preparingOrders: 0,
    readyOrders: 0,
    pickedUpOrders: 0,
    onTheWayOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    avgRating: 4.5,
    revenueGrowth: 0,
    orderGrowth: 0,
    completionRate: 0,
  });
  
  const [revenueData, setRevenueData] = useState([
    { name: 'Jan', revenue: 0, orders: 0 },
    { name: 'Feb', revenue: 0, orders: 0 },
    { name: 'Mar', revenue: 0, orders: 0 },
    { name: 'Apr', revenue: 0, orders: 0 },
    { name: 'May', revenue: 0, orders: 0 },
    { name: 'Jun', revenue: 0, orders: 0 },
  ]);

  const [statusData, setStatusData] = useState([
    { month: 'Jan', pending: 0, preparing: 0, delivered: 0 },
    { month: 'Feb', pending: 0, preparing: 0, delivered: 0 },
    { month: 'Mar', pending: 0, preparing: 0, delivered: 0 },
    { month: 'Apr', pending: 0, preparing: 0, delivered: 0 },
    { month: 'May', pending: 0, preparing: 0, delivered: 0 },
    { month: 'Jun', pending: 0, preparing: 0, delivered: 0 },
  ]);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser || currentUser.role !== 'owner') {
      router.push('/');
      return;
    }
    setUser(currentUser);
    fetchOwnerData();
  }, []);

  const fetchOwnerData = async () => {
    setLoading(true);
    try {
      const currentUser = auth.getCurrentUser();
      
      // Fetch restaurants owned by this owner
      const restaurantsRes = await api.get(`/restaurants?ownerId=${currentUser?.id}`);
      const ownerRestaurants = restaurantsRes.data || [];
      setRestaurants(ownerRestaurants);
      
      // Fetch orders for owner's restaurants
      let allOrders: any[] = [];
      try {
        const ordersRes = await api.get('/orders/my-restaurant');
        allOrders = ordersRes.data || [];
      } catch (err) {
        if (ownerRestaurants.length > 0) {
          const allOrdersRes = await api.get('/orders');
          const allOrdersData = allOrdersRes.data || [];
          const restaurantIds = ownerRestaurants.map((r: any) => r.id);
          allOrders = allOrdersData.filter((order: any) => 
            restaurantIds.includes(order.restaurantId)
          );
        }
      }
      setOrders(allOrders);
      
      // ✅ FIXED: Calculate real stats with proper number conversion
      const completedOrders = allOrders.filter((o: any) => o.status === 'delivered');
      
      // Convert string to number before summing
      const totalRevenue = completedOrders.reduce((sum: number, o: any) => {
        return sum + parseAmount(o.totalAmount);
      }, 0);
      
      const totalOrders = allOrders.length;
      
      // Calculate growth rates (compare with previous period)
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYearOrders = allOrders.filter(o => {
        const date = new Date(o.placedAt);
        return date.getMonth() === currentMonth;
      });
      const previousMonthOrders = allOrders.filter(o => {
        const date = new Date(o.placedAt);
        return date.getMonth() === currentMonth - 1;
      });
      
      const orderGrowth = previousMonthOrders.length 
        ? ((currentYearOrders.length - previousMonthOrders.length) / previousMonthOrders.length) * 100 
        : 0;
      
      // ✅ FIXED: Convert to numbers for revenue growth calculation
      const currentMonthRevenue = completedOrders
        .filter(o => {
          const date = new Date(o.placedAt);
          return date.getMonth() === currentMonth;
        })
        .reduce((sum, o) => sum + parseAmount(o.totalAmount), 0);
        
      const previousMonthRevenue = completedOrders
        .filter(o => {
          const date = new Date(o.placedAt);
          return date.getMonth() === currentMonth - 1;
        })
        .reduce((sum, o) => sum + parseAmount(o.totalAmount), 0);
      
      const revenueGrowth = previousMonthRevenue 
        ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
        : 0;
      
      // ✅ FIXED: Calculate monthly data with proper number conversion
      const monthlyData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleString('default', { month: 'short' });
        const monthOrders = allOrders.filter(o => {
          const orderDate = new Date(o.placedAt);
          return orderDate.getMonth() === date.getMonth() && 
                 orderDate.getFullYear() === date.getFullYear();
        });
        const monthRevenue = monthOrders
          .filter(o => o.status === 'delivered')
          .reduce((sum, o) => sum + parseAmount(o.totalAmount), 0);
        
        monthlyData.push({
          name: monthName,
          revenue: monthRevenue,
          orders: monthOrders.length,
        });
      }
      setRevenueData(monthlyData);
      
      // Calculate status distribution for chart
      const last6Months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleString('default', { month: 'short' });
        const monthOrders = allOrders.filter(o => {
          const orderDate = new Date(o.placedAt);
          return orderDate.getMonth() === date.getMonth() && 
                 orderDate.getFullYear() === date.getFullYear();
        });
        
        last6Months.push({
          month: monthName,
          pending: monthOrders.filter(o => o.status === 'pending').length,
          preparing: monthOrders.filter(o => o.status === 'preparing').length,
          delivered: monthOrders.filter(o => o.status === 'delivered').length,
        });
      }
      setStatusData(last6Months);
      
      setStats({
        totalRestaurants: ownerRestaurants.length,
        totalOrders: allOrders.length,
        totalRevenue,
        pendingOrders: allOrders.filter((o: any) => o.status === 'pending').length,
        preparingOrders: allOrders.filter((o: any) => o.status === 'preparing').length,
        readyOrders: allOrders.filter((o: any) => o.status === 'ready').length,
        pickedUpOrders: allOrders.filter((o: any) => o.status === 'picked_up').length,
        onTheWayOrders: allOrders.filter((o: any) => o.status === 'on_the_way').length,
        completedOrders: completedOrders.length,
        cancelledOrders: allOrders.filter((o: any) => o.status === 'cancelled').length,
        avgRating: 4.5,
        revenueGrowth: Math.round(revenueGrowth * 10) / 10,
        orderGrowth: Math.round(orderGrowth * 10) / 10,
        completionRate: totalOrders ? Math.round((completedOrders.length / totalOrders) * 100) : 0,
      });
      
    } catch (error) {
      console.error('Failed to fetch owner data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; text: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending' },
      preparing: { color: 'bg-blue-100 text-blue-800', text: 'Preparing' },
      ready: { color: 'bg-green-100 text-green-800', text: 'Ready' },
      picked_up: { color: 'bg-purple-100 text-purple-800', text: 'Picked Up' },
      on_the_way: { color: 'bg-indigo-100 text-indigo-800', text: 'On the Way' },
      delivered: { color: 'bg-gray-100 text-gray-800', text: 'Delivered' },
      cancelled: { color: 'bg-red-100 text-red-800', text: 'Cancelled' },
    };
    return badges[status] || { color: 'bg-gray-100 text-gray-800', text: status };
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success(`Order status updated to ${status}`);
      fetchOwnerData(); // Reload data instead of page refresh
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
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
        <h1 className="text-2xl font-bold text-gray-800">Dashboard Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.fullName?.split(' ')[0] || 'Owner'}</p>
      </div>
      
      {/* Main Stats Cards - 4 cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={stats.totalRevenue}
          icon={DollarSign}
          trend={stats.revenueGrowth}
          color="bg-gradient-to-r from-green-500 to-green-600"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          icon={ShoppingBag}
          trend={stats.orderGrowth}
          color="bg-gradient-to-r from-blue-500 to-blue-600"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          icon={CheckCircle}
          color="bg-gradient-to-r from-orange-500 to-orange-600"
        />
        <StatCard
          title="Avg Rating"
          value={stats.avgRating}
          icon={Star}
          color="bg-gradient-to-r from-purple-500 to-purple-600"
        />
      </div>

      {/* Secondary Stats - Order Status Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3 mb-8">
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold">{stats.totalOrders}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Pending</p>
          <p className="text-xl font-bold text-yellow-600">{stats.pendingOrders}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Preparing</p>
          <p className="text-xl font-bold text-blue-600">{stats.preparingOrders}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Ready</p>
          <p className="text-xl font-bold text-green-600">{stats.readyOrders}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Picked Up</p>
          <p className="text-xl font-bold text-purple-600">{stats.pickedUpOrders}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">On the Way</p>
          <p className="text-xl font-bold text-indigo-600">{stats.onTheWayOrders}</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <p className="text-xs text-gray-500">Delivered</p>
          <p className="text-xl font-bold text-emerald-600">{stats.completedOrders}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Revenue & Orders Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} name="Revenue (৳)" />
              <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} name="Orders" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Order Status Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="pending" fill="#eab308" name="Pending" />
              <Bar dataKey="preparing" fill="#3b82f6" name="Preparing" />
              <Bar dataKey="delivered" fill="#10b981" name="Delivered" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Recent Orders</h3>
          <p className="text-sm text-gray-500 mt-1">Track and manage incoming orders</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Restaurant</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Placed At</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.slice(0, 10).map((order) => {
                const statusInfo = getStatusBadge(order.status);
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm font-medium text-gray-800">
                      #{order.id.slice(-8).toUpperCase()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.restaurant?.name || 'Restaurant'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {order.customerName || 'Customer'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-orange-600">
                      ৳{formatSafeNumber(parseAmount(order.totalAmount))}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.text}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {order.placedAt ? new Date(order.placedAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'preparing')}
                            className="text-xs bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600"
                          >
                            Accept
                          </button>
                        )}
                        {order.status === 'preparing' && (
                          <button
                            onClick={() => updateOrderStatus(order.id, 'ready')}
                            className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600"
                          >
                            Ready
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/orders/${order.id}`)}
                          className="text-xs border border-gray-200 px-3 py-1 rounded-lg hover:bg-gray-50"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    No orders yet
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