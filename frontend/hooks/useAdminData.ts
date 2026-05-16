'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface DashboardStats {
  totalUsers: number;
  totalRestaurants: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOwners: number;
  pendingAgents: number;
  activeAgents: number;
  avgRating: number;
  revenueGrowth: number;
  orderGrowth: number;
  userGrowth: number;
  completionRate: number;
}

interface Application {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  businessName?: string;
  businessAddress?: string;
  nidNumber?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  drivingLicense?: string;
  createdAt: string;
}

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  lastLogin?: string;
  orders?: number;
  totalSpent?: number;
}

interface Order {
  id: string;
  totalAmount: number;
  status: string;
  placedAt: string;
  customer?: { fullName: string; email: string; phone?: string };
  restaurant?: { name: string; address?: string };
  deliveryAgent?: { fullName: string };
}

interface UseAdminDataReturn {
  stats: DashboardStats;
  pendingApplications: Application[];
  users: User[];
  recentOrders: Order[];
  restaurants: any[];
  deliveryAgents: any[];
  revenueData: any[];
  orderData: any[];
  userData: any[];
  loading: boolean;
  refreshing: boolean;
  fetchAllData: () => Promise<void>;
  fetchChartData: () => Promise<void>;
  approveApplication: (userId: string, role: string) => Promise<void>;
  rejectApplication: (userId: string) => Promise<void>;
  updateUserStatus: (userId: string, status: string) => Promise<void>;
  updateRestaurantStatus: (restaurantId: string, status: string) => Promise<void>;
  exportData: (type: string) => Promise<void>;
}

export function useAdminData(): UseAdminDataReturn {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalRestaurants: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOwners: 0,
    pendingAgents: 0,
    activeAgents: 0,
    avgRating: 0,
    revenueGrowth: 0,
    orderGrowth: 0,
    userGrowth: 0,
    completionRate: 0,
  });
  const [pendingApplications, setPendingApplications] = useState<Application[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [deliveryAgents, setDeliveryAgents] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [orderData, setOrderData] = useState<any[]>([]);
  const [userData, setUserData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAllData = useCallback(async () => {
    try {
      const [
        pendingRes,
        statsRes,
        usersRes,
        ordersRes,
        restaurantsRes,
        agentsRes,
      ] = await Promise.allSettled([
        api.get('/admin/pending-approvals'),
        api.get('/admin/dashboard/stats'),
        api.get('/admin/users'),
        api.get('/admin/orders/recent'),
        api.get('/admin/restaurants'),
        api.get('/admin/delivery-agents'),
      ]);

      if (pendingRes.status === 'fulfilled') setPendingApplications(pendingRes.value.data);
      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (usersRes.status === 'fulfilled') setUsers(usersRes.value.data);
      if (ordersRes.status === 'fulfilled') setRecentOrders(ordersRes.value.data);
      if (restaurantsRes.status === 'fulfilled') setRestaurants(restaurantsRes.value.data);
      if (agentsRes.status === 'fulfilled') setDeliveryAgents(agentsRes.value.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchChartData = useCallback(async () => {
    try {
      const [revenue, orders, users] = await Promise.all([
        api.get('/admin/charts/revenue'),
        api.get('/admin/charts/orders'),
        api.get('/admin/charts/users'),
      ]);
      setRevenueData(revenue.data);
      setOrderData(orders.data);
      setUserData(users.data);
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
    }
  }, []);

  const approveApplication = useCallback(async (userId: string, role: string) => {
    try {
      await api.patch(`/admin/approve/${userId}`, null, { params: { role } });
      toast.success('Application approved successfully');
      await fetchAllData();
    } catch (error) {
      toast.error('Failed to approve application');
      throw error;
    }
  }, [fetchAllData]);

  const rejectApplication = useCallback(async (userId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    try {
      await api.patch(`/admin/reject/${userId}`, null, { params: { reason } });
      toast.success('Application rejected');
      await fetchAllData();
    } catch (error) {
      toast.error('Failed to reject application');
      throw error;
    }
  }, [fetchAllData]);

  const updateUserStatus = useCallback(async (userId: string, status: string) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, null, { params: { status } });
      toast.success('User status updated');
      await fetchAllData();
    } catch (error) {
      toast.error('Failed to update user status');
      throw error;
    }
  }, [fetchAllData]);

  const updateRestaurantStatus = useCallback(async (restaurantId: string, status: string) => {
    try {
      await api.patch(`/admin/restaurants/${restaurantId}/status`, null, { params: { status } });
      toast.success('Restaurant status updated');
      await fetchAllData();
    } catch (error) {
      toast.error('Failed to update restaurant status');
      throw error;
    }
  }, [fetchAllData]);

  const exportData = useCallback(async (type: string) => {
    try {
      const response = await api.get(`/admin/export/${type}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_${new Date().toISOString()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success(`${type} exported successfully`);
    } catch (error) {
      toast.error('Failed to export data');
      throw error;
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchAllData(), fetchChartData()]);
  }, [fetchAllData, fetchChartData]);

  useEffect(() => {
    refreshAll();
    const interval = setInterval(refreshAll, 30000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  return {
    stats,
    pendingApplications,
    users,
    recentOrders,
    restaurants,
    deliveryAgents,
    revenueData,
    orderData,
    userData,
    loading,
    refreshing,
    fetchAllData: refreshAll,
    fetchChartData,
    approveApplication,
    rejectApplication,
    updateUserStatus,
    updateRestaurantStatus,
    exportData,
  };
}