'use client';

import { useEffect, useState, JSX, useCallback } from 'react';
import { api } from '@/lib/api';
import {
  Search,
  Download,
  RefreshCw,
  MoreVertical,
  Ban,
  Trash2,
  Shield,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users as UsersIcon,
  X,
  ShoppingBag,
  Store,
  Bike,
  Mail,
  Phone,
  Calendar,
  AlertTriangle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import { unwrapPaginated } from '@/lib/unwrapPaginated';

interface User {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  orders: number;
  totalSpent: number;
  createdAt: string;
  lastLogin: string;
  businessName?: string;
  vehicleType?: string;
}

interface UserDetailData {
  user: User & {
    businessName?: string;
    vehicleType?: string;
    restaurants?: Array<{ id: string; name: string; address?: string; isOpen?: boolean }>;
  };
  recentOrders: Array<{
    id: string;
    orderNumber?: string;
    status: string;
    totalAmount: number;
    placedAt: string;
    restaurant?: { name: string };
  }>;
  stats: {
    totalOrders: number;
    completedOrders: number;
    totalSpent: number;
    averageOrderValue: number;
  };
}

const ROLE_TINT: Record<string, string> = {
  admin: 'bg-purple-50 text-purple-700 border-purple-100',
  owner: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  agent: 'bg-blue-50 text-blue-700 border-blue-100',
  customer: 'bg-gray-100 text-gray-700 border-gray-200',
};

const STATUS_META: Record<string, { tint: string; icon: JSX.Element }> = {
  pending: { tint: 'bg-amber-50 text-amber-700 border-amber-100', icon: <AlertCircle className="w-3 h-3" /> },
  approved: { tint: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <CheckCircle className="w-3 h-3" /> },
  active: { tint: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { tint: 'bg-red-50 text-red-700 border-red-100', icon: <XCircle className="w-3 h-3" /> },
  suspended: { tint: 'bg-rose-50 text-rose-700 border-rose-100', icon: <Ban className="w-3 h-3" /> },
  inactive: { tint: 'bg-gray-100 text-gray-600 border-gray-200', icon: <></> },
};

const ORDER_STATUS_TINT: Record<string, string> = {
  DELIVERED: 'bg-emerald-50 text-emerald-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-red-50 text-red-700',
  cancelled: 'bg-red-50 text-red-700',
  PENDING: 'bg-amber-50 text-amber-700',
  pending: 'bg-amber-50 text-amber-700',
  PREPARING: 'bg-blue-50 text-blue-700',
  preparing: 'bg-blue-50 text-blue-700',
  OUT_FOR_DELIVERY: 'bg-purple-50 text-purple-700',
  out_for_delivery: 'bg-purple-50 text-purple-700',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals state
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetailData, setUserDetailData] = useState<UserDetailData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [roleChangeTarget, setRoleChangeTarget] = useState<User | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<string>('customer');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const [stats, setStats] = useState({
    totalUsers: 0,
    customers: 0,
    owners: 0,
    agents: 0,
    admins: 0,
    pendingApprovals: 0,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), page: String(page) });
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const response = await api.get(`/admin/users?${params.toString()}`);
      const { items, total: t, totalPages: tp } = unwrapPaginated<User>(response.data);
      setUsers(items);
      setTotal(t);
      setTotalPages(tp);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [page, roleFilter, statusFilter, limit]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/admin/users/stats');
      const raw = response.data?.data ?? response.data;
      setStats((prev) => ({ ...prev, ...raw }));
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, statusFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedUser(null);
        setRoleChangeTarget(null);
        setUserToDelete(null);
        setShowActionMenu(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch full user details for the modal
  const handleOpenUserDetails = async (user: User) => {
    setSelectedUser(user);
    setShowActionMenu(null);
    setDetailLoading(true);
    try {
      const response = await api.get(`/admin/users/${user.id}`);
      const raw = response.data?.data ?? response.data;
      setUserDetailData(raw);
    } catch (error) {
      console.error('Failed to load deep user details:', error);
      // Fallback with current table row data
      setUserDetailData({
        user,
        recentOrders: [],
        stats: {
          totalOrders: user.orders || 0,
          completedOrders: user.orders || 0,
          totalSpent: user.totalSpent || 0,
          averageOrderValue: user.orders ? (user.totalSpent || 0) / user.orders : 0,
        },
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/admin/export/users', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
      link.remove();
      toast.success('Users exported successfully');
    } catch (error) {
      console.error('Failed to export users:', error);
      toast.error('Failed to export');
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      toast.success(`User status updated to ${newStatus}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, status: newStatus } : null));
        if (userDetailData) {
          setUserDetailData((prev) =>
            prev ? { ...prev, user: { ...prev.user, status: newStatus } } : null
          );
        }
      }
      fetchStats();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    } finally {
      setActionLoading(false);
      setShowActionMenu(null);
    }
  };

  const handleRoleChangeConfirm = async () => {
    if (!roleChangeTarget) return;
    setActionLoading(true);
    try {
      await api.patch(`/admin/users/${roleChangeTarget.id}/role`, { role: selectedNewRole });
      toast.success(`User role updated to ${selectedNewRole}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === roleChangeTarget.id ? { ...u, role: selectedNewRole } : u))
      );
      if (selectedUser && selectedUser.id === roleChangeTarget.id) {
        setSelectedUser((prev) => (prev ? { ...prev, role: selectedNewRole } : null));
      }
      setRoleChangeTarget(null);
      fetchStats();
    } catch (error) {
      console.error('Failed to update role:', error);
      toast.error('Failed to update role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUserConfirm = async () => {
    if (!userToDelete) return;
    setActionLoading(true);
    try {
      await api.delete(`/admin/users/${userToDelete.id}`);
      toast.success('User deleted successfully');
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      if (selectedUser && selectedUser.id === userToDelete.id) {
        setSelectedUser(null);
      }
      setUserToDelete(null);
      fetchStats();
    } catch (error) {
      console.error('Failed to delete user:', error);
      toast.error('Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      user.fullName?.toLowerCase().includes(term) ||
      user.email?.toLowerCase().includes(term) ||
      user.phone?.includes(term);
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading && users.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl border border-gray-100" />
          ))}
        </div>
        <div className="h-96 bg-gray-100 rounded-2xl border border-gray-100" />
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Directory of customers, restaurant owners, delivery couriers, and administrators
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button
            onClick={() => {
              fetchUsers();
              fetchStats();
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Users', value: stats.totalUsers, accent: 'text-gray-900' },
          { label: 'Customers', value: stats.customers, accent: 'text-gray-900' },
          { label: 'Restaurant Owners', value: stats.owners, accent: 'text-gray-900' },
          { label: 'Delivery Agents', value: stats.agents, accent: 'text-gray-900' },
          { label: 'Pending Approvals', value: stats.pendingApprovals, accent: 'text-amber-600' },
        ].map((tile) => (
          <div
            key={tile.label}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-4"
          >
            <p className="text-xs text-gray-400 font-medium">{tile.label}</p>
            <p className={`text-2xl font-bold tabular-nums mt-0.5 ${tile.accent}`}>
              {tile.value?.toLocaleString() || 0}
            </p>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition cursor-pointer bg-white"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="customer">Customers</option>
          <option value="owner">Restaurant Owners</option>
          <option value="agent">Delivery Agents</option>
          <option value="admin">Administrators</option>
        </select>
        <select
          className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition cursor-pointer bg-white"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="approved">Approved / Active</option>
          <option value="pending">Pending</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Orders
                </th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Total Spent
                </th>
                <th className="px-6 py-3.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3.5 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map((user) => {
                const statusMeta = STATUS_META[user.status] || STATUS_META.inactive;
                return (
                  <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div
                        onClick={() => handleOpenUserDetails(user)}
                        className="flex items-center gap-3 cursor-pointer group"
                      >
                        <div className="w-9 h-9 rounded-full bg-linear-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-semibold shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                          {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-gray-900 group-hover:text-orange-600 transition truncate">
                            {user.fullName}
                          </div>
                          <div className="text-xs text-gray-400 font-mono">
                            ID: {user.id?.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 truncate max-w-[200px]">
                        {user.email}
                      </div>
                      <div className="text-xs text-gray-400">
                        {user.phone || 'No phone'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize border ${
                          ROLE_TINT[user.role] || ROLE_TINT.customer
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium capitalize border ${statusMeta.tint}`}
                      >
                        {statusMeta.icon}
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800 tabular-nums">
                      {user.orders || 0}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-orange-600 tabular-nums">
                      ৳{(user.totalSpent || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="relative flex justify-end">
                        <button
                          onClick={() =>
                            setShowActionMenu(showActionMenu === user.id ? null : user.id)
                          }
                          className="p-1.5 hover:bg-gray-100 rounded-lg transition cursor-pointer text-gray-500 hover:text-gray-800"
                          aria-label="Actions"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {showActionMenu === user.id && (
                          <div className="absolute right-0 top-9 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                            <button
                              onClick={() => handleOpenUserDetails(user)}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700 cursor-pointer"
                            >
                              <Eye className="w-4 h-4 text-gray-400" /> View Details
                            </button>
                            {user.role !== 'admin' && (
                              <>
                                <div className="border-t border-gray-100 my-1" />
                                <button
                                  onClick={() =>
                                    handleStatusChange(
                                      user.id,
                                      user.status === 'suspended' ? 'approved' : 'suspended'
                                    )
                                  }
                                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700 cursor-pointer"
                                >
                                  <Ban className="w-4 h-4 text-gray-400" />
                                  {user.status === 'suspended' ? 'Reactivate User' : 'Suspend User'}
                                </button>
                                <button
                                  onClick={() => {
                                    setRoleChangeTarget(user);
                                    setSelectedNewRole(user.role);
                                    setShowActionMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700 cursor-pointer"
                                >
                                  <Shield className="w-4 h-4 text-gray-400" /> Change Role
                                </button>
                                <div className="border-t border-gray-100 my-1" />
                                <button
                                  onClick={() => {
                                    setUserToDelete(user);
                                    setShowActionMenu(null);
                                  }}
                                  className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4 text-red-500" /> Delete User
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="p-14 text-center">
            <UsersIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">No users found</p>
            <p className="text-xs text-gray-400 mt-1">
              Try adjusting your search query or filter settings
            </p>
          </div>
        )}
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={total}
        limit={limit}
        onPageChange={setPage}
        loading={loading}
      />

      {/* ======================================================== */}
      {/* 1. ADVANCED USER DETAILS MODAL                           */}
      {/* ======================================================== */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white p-5 border-b border-gray-100 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-linear-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-base font-bold shadow-xs">
                  {selectedUser.fullName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">{selectedUser.fullName}</h3>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize border ${
                        ROLE_TINT[selectedUser.role] || ROLE_TINT.customer
                      }`}
                    >
                      {selectedUser.role}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium capitalize border ${
                        (STATUS_META[selectedUser.status] || STATUS_META.inactive).tint
                      }`}
                    >
                      {selectedUser.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">User ID: {selectedUser.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {detailLoading ? (
                <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500 mb-2" />
                  <p className="text-xs">Loading comprehensive user records...</p>
                </div>
              ) : (
                <>
                  {/* Account Information Card */}
                  <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Contact & Account Info
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2.5 text-gray-700">
                        <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                        <span className="truncate">{selectedUser.email}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-gray-700">
                        <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>{selectedUser.phone || 'No phone recorded'}</span>
                      </div>
                      <div className="flex items-center gap-2.5 text-gray-700">
                        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>
                          Member since:{' '}
                          {selectedUser.createdAt
                            ? new Date(selectedUser.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5 text-gray-700">
                        <CheckCircle className="w-4 h-4 text-gray-400 shrink-0" />
                        <span>
                          Last active:{' '}
                          {selectedUser.lastLogin
                            ? new Date(selectedUser.lastLogin).toLocaleDateString()
                            : 'Recent'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Financial & Activity KPI Grid */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                      Platform Activity & Lifetime Value
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-xs">
                        <p className="text-xs text-gray-400">Total Orders</p>
                        <p className="text-xl font-bold text-gray-900 mt-0.5 tabular-nums">
                          {userDetailData?.stats?.totalOrders ?? selectedUser.orders ?? 0}
                        </p>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-xs">
                        <p className="text-xs text-gray-400">Delivered</p>
                        <p className="text-xl font-bold text-emerald-600 mt-0.5 tabular-nums">
                          {userDetailData?.stats?.completedOrders ?? selectedUser.orders ?? 0}
                        </p>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-xs">
                        <p className="text-xs text-gray-400">Total Spent</p>
                        <p className="text-xl font-bold text-orange-600 mt-0.5 tabular-nums">
                          ৳
                          {(
                            userDetailData?.stats?.totalSpent ??
                            selectedUser.totalSpent ??
                            0
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-xs">
                        <p className="text-xs text-gray-400">Avg Order Value</p>
                        <p className="text-xl font-bold text-gray-800 mt-0.5 tabular-nums">
                          ৳
                          {Math.round(
                            userDetailData?.stats?.averageOrderValue ??
                              (selectedUser.orders
                                ? (selectedUser.totalSpent || 0) / selectedUser.orders
                                : 0)
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Owned Restaurants (if Owner) */}
                  {selectedUser.role === 'owner' &&
                    userDetailData?.user?.restaurants &&
                    userDetailData.user.restaurants.length > 0 && (
                      <div>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                          <Store className="w-3.5 h-3.5" /> Associated Restaurants
                        </h4>
                        <div className="space-y-2">
                          {userDetailData.user.restaurants.map((rest) => (
                            <div
                              key={rest.id}
                              className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between"
                            >
                              <div>
                                <p className="font-semibold text-sm text-gray-800">{rest.name}</p>
                                <p className="text-xs text-gray-400">{rest.address || 'No address'}</p>
                              </div>
                              <span
                                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                                  rest.isOpen
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {rest.isOpen ? 'Open Now' : 'Closed'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Recent Orders List */}
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <ShoppingBag className="w-3.5 h-3.5" /> Recent Orders (Last 10)
                    </h4>
                    {userDetailData?.recentOrders && userDetailData.recentOrders.length > 0 ? (
                      <div className="space-y-2">
                        {userDetailData.recentOrders.map((order) => (
                          <div
                            key={order.id}
                            className="p-3 bg-white border border-gray-100 rounded-xl shadow-xs flex items-center justify-between text-sm"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-800">
                                  {order.restaurant?.name || 'QuickBite Partner'}
                                </span>
                                <span className="text-xs text-gray-400 font-mono">
                                  #{order.orderNumber || order.id.slice(0, 8)}
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {order.placedAt ? new Date(order.placedAt).toLocaleString() : 'N/A'}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-gray-900 tabular-nums">
                                ৳{Number(order.totalAmount).toLocaleString()}
                              </span>
                              <span
                                className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${
                                  ORDER_STATUS_TINT[order.status] || 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {order.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 bg-gray-50 rounded-xl border border-gray-100 text-center">
                        <ShoppingBag className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
                        <p className="text-xs text-gray-500 font-medium">No order history recorded</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex flex-wrap gap-2 justify-between items-center">
              <div className="flex gap-2">
                {selectedUser.role !== 'admin' && (
                  <>
                    <button
                      disabled={actionLoading}
                      onClick={() =>
                        handleStatusChange(
                          selectedUser.id,
                          selectedUser.status === 'suspended' ? 'approved' : 'suspended'
                        )
                      }
                      className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
                        selectedUser.status === 'suspended'
                          ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      }`}
                    >
                      <Ban className="w-3.5 h-3.5" />
                      {selectedUser.status === 'suspended' ? 'Reactivate Account' : 'Suspend Account'}
                    </button>
                    <button
                      onClick={() => {
                        setRoleChangeTarget(selectedUser);
                        setSelectedNewRole(selectedUser.role);
                      }}
                      className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5" /> Change Role
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. ROLE CHANGE MODAL                                     */}
      {/* ======================================================== */}
      {roleChangeTarget && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setRoleChangeTarget(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-50 rounded-xl text-purple-600">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Change User Role</h3>
                  <p className="text-xs text-gray-500">
                    Update permissions for {roleChangeTarget.fullName}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRoleChangeTarget(null)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 space-y-2.5">
              {[
                {
                  role: 'customer',
                  title: 'Customer',
                  desc: 'Standard consumer account. Can browse menus, order food, and post reviews.',
                  icon: ShoppingBag,
                },
                {
                  role: 'owner',
                  title: 'Restaurant Owner',
                  desc: 'Can manage restaurants, create food items, and track restaurant orders.',
                  icon: Store,
                },
                {
                  role: 'agent',
                  title: 'Delivery Agent',
                  desc: 'Can accept delivery assignments, view driver dispatch, and track earnings.',
                  icon: Bike,
                },
                {
                  role: 'admin',
                  title: 'Administrator',
                  desc: 'Full administrative access across settings, all users, logs, and finances.',
                  icon: Shield,
                },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = selectedNewRole === item.role;
                return (
                  <div
                    key={item.role}
                    onClick={() => setSelectedNewRole(item.role)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50/40 ring-2 ring-orange-500/20'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/50'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                        isSelected ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm text-gray-900">{item.title}</span>
                        {roleChangeTarget.role === item.role && (
                          <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedNewRole === 'admin' && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex items-start gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Security notice:</strong> Administrator accounts have privileged access
                  over the entire platform, including financial settings and audit logs.
                </span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRoleChangeTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading || selectedNewRole === roleChangeTarget.role}
                onClick={handleRoleChangeConfirm}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Change
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. DELETE USER CONFIRMATION MODAL                        */}
      {/* ======================================================== */}
      {userToDelete && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setUserToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-center text-lg text-gray-900">Delete User Account?</h3>
            <p className="text-xs text-center text-gray-500 mt-1">
              Are you sure you want to delete <strong>{userToDelete.fullName}</strong> (
              {userToDelete.email})?
            </p>
            <div className="my-4 p-3 bg-red-50/60 rounded-xl border border-red-100 text-[11px] text-red-700 leading-relaxed">
              This action marks the user as deleted. Delivered order transactions will be retained
              for accounting and audit trail integrity, but the user will lose system access.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDeleteUserConfirm}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}