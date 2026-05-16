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
  Clock
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
  completedOrders: number;
  avgRating: number;
  revenueGrowth: number;
  orderGrowth: number;
  completionRate: number;
}

const StatCard = ({ title, value, icon: Icon, trend, color }: any) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-all duration-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">{typeof value === 'number' ? value.toLocaleString() : value}</p>
        {trend !== undefined && (
          <div className="flex items-center gap-1 mt-2">
            {trend >= 0 ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
            <span className={`text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {Math.abs(trend)}% from last month
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
    completedOrders: 0,
    avgRating: 0,
    revenueGrowth: 12.5,
    orderGrowth: 8.3,
    completionRate: 94,
  });
  
  const [revenueData, setRevenueData] = useState([
    { month: 'Jan', revenue: 12000, orders: 45 },
    { month: 'Feb', revenue: 15000, orders: 52 },
    { month: 'Mar', revenue: 18000, orders: 68 },
    { month: 'Apr', revenue: 22000, orders: 85 },
    { month: 'May', revenue: 25000, orders: 98 },
    { month: 'Jun', revenue: 28000, orders: 112 },
  ]);
  
  const [statusData, setStatusData] = useState([
    { month: 'Jan', pending: 12, preparing: 8, delivered: 25 },
    { month: 'Feb', pending: 10, preparing: 12, delivered: 30 },
    { month: 'Mar', pending: 15, preparing: 10, delivered: 43 },
    { month: 'Apr', pending: 8, preparing: 15, delivered: 62 },
    { month: 'May', pending: 6, preparing: 18, delivered: 74 },
    { month: 'Jun', pending: 4, preparing: 20, delivered: 88 },
  ]);

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
    setLoading(true);
    try {
      const currentUser = auth.getCurrentUser();
      
      // Fetch restaurants owned by this owner
      const restaurantsRes = await api.get(`/restaurants?ownerId=${currentUser?.id}`);
      const ownerRestaurants = restaurantsRes.data || [];
      setRestaurants(ownerRestaurants);
      
      // Fetch orders
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
      
      // Calculate stats
      const completedOrders = allOrders.filter((o: any) => o.status === 'delivered');
      const totalRevenue = completedOrders.reduce((sum: number, o: any) => sum + o.totalAmount, 0);
      
      setStats({
        totalRestaurants: ownerRestaurants.length,
        totalOrders: allOrders.length,
        totalRevenue,
        pendingOrders: allOrders.filter((o: any) => o.status === 'pending').length,
        preparingOrders: allOrders.filter((o: any) => o.status === 'preparing').length,
        readyOrders: allOrders.filter((o: any) => o.status === 'ready').length,
        completedOrders: completedOrders.length,
        avgRating: 4.5,
        revenueGrowth: 12.5,
        orderGrowth: 8.3,
        completionRate: allOrders.length ? Math.round((completedOrders.length / allOrders.length) * 100) : 0,
      });
      
    } catch (error) {
      console.error('Failed to fetch owner data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      preparing: 'bg-blue-100 text-blue-800',
      ready: 'bg-green-100 text-green-800',
      picked_up: 'bg-purple-100 text-purple-800',
      delivered: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Revenue"
          value={`৳${stats.totalRevenue.toLocaleString()}`}
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
          title="Total Restaurants"
          value={stats.totalRestaurants}
          icon={Store}
          color="bg-gradient-to-r from-purple-500 to-purple-600"
        />
        <StatCard
          title="Completion Rate"
          value={`${stats.completionRate}%`}
          icon={CheckCircle}
          color="bg-gradient-to-r from-orange-500 to-orange-600"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Pending Orders</p>
          <p className="text-xl font-bold text-yellow-600">{stats.pendingOrders}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Preparing</p>
          <p className="text-xl font-bold text-blue-600">{stats.preparingOrders}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Ready</p>
          <p className="text-xl font-bold text-green-600">{stats.readyOrders}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-xl font-bold text-gray-800">{stats.completedOrders}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <p className="text-xs text-gray-500">Avg Rating</p>
          <div className="flex items-center gap-1">
            <p className="text-xl font-bold">{stats.avgRating}</p>
            <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-4">Revenue Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} name="Revenue (৳)" />
              <Line type="monotone" dataKey="orders" stroke="#3b82f6" strokeWidth={2} name="Orders" />
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
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orders.slice(0, 5).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">
                    #{order.id.slice(-8).toUpperCase()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {order.restaurant?.name || 'Restaurant'}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-orange-600">
                    ৳{order.totalAmount}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <button className="text-xs bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600">
                          Accept
                        </button>
                      )}
                      {order.status === 'preparing' && (
                        <button className="text-xs bg-green-500 text-white px-3 py-1 rounded-lg hover:bg-green-600">
                          Ready
                        </button>
                      )}
                      <button className="text-xs border border-gray-200 px-3 py-1 rounded-lg hover:bg-gray-50">
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-500">
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