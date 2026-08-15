'use client';

import { useEffect, useState, JSX } from 'react';
import { api } from '@/lib/api';
import { Search, Download, RefreshCw, MoreVertical, Edit, Ban, Trash2, Shield, Eye, CheckCircle, XCircle, AlertCircle, Users as UsersIcon } from 'lucide-react';
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
}

const ROLE_TINT: Record<string, string> = {
  admin: 'bg-purple-50 text-purple-700',
  owner: 'bg-emerald-50 text-emerald-700',
  agent: 'bg-blue-50 text-blue-700',
  customer: 'bg-gray-100 text-gray-600',
};

const STATUS_META: Record<string, { tint: string; icon: JSX.Element }> = {
  pending: { tint: 'bg-amber-50 text-amber-700', icon: <AlertCircle className="w-3 h-3" /> },
  approved: { tint: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle className="w-3 h-3" /> },
  rejected: { tint: 'bg-red-50 text-red-700', icon: <XCircle className="w-3 h-3" /> },
  suspended: { tint: 'bg-red-50 text-red-700', icon: <XCircle className="w-3 h-3" /> },
  inactive: { tint: 'bg-gray-100 text-gray-600', icon: <></> },
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  const [roleChangeTarget, setRoleChangeTarget] = useState<User | null>(null);

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

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter]);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const response = await api.get('/admin/users/stats');
      const raw = response.data?.data ?? response.data;
      setStats((prev) => ({ ...prev, ...raw }));
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  }

  async function fetchUsers() {
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
  }

  // ... (Your existing handleExport, handleStatusChange, handleRoleChange, handleDeleteUser methods remain exactly the same)
  const handleExport = async () => {
    try {
      const response = await api.get('/admin/export/users', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a'); link.href = url;
      link.setAttribute('download', `users_${new Date().toISOString()}.csv`);
      link.click(); link.remove();
      toast.success('Users exported successfully');
    } catch (error) { toast.error('Failed to export'); }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      toast.success(`User status updated to ${newStatus}`);
      fetchUsers(); fetchStats();
    } catch (error) { toast.error('Failed to update status'); }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      toast.success(`User role updated to ${newRole}`);
      setRoleChangeTarget(null);
      fetchUsers(); fetchStats();
    } catch (error) { toast.error('Failed to update role'); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await api.delete(`/admin/users/${userId}`);
        toast.success('User deleted successfully');
        fetchUsers(); fetchStats();
      } catch (error) { toast.error('Failed to delete user'); }
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl border border-gray-100" />)}
        </div>
        <div className="h-96 bg-gray-100 rounded-2xl border border-gray-100" />
      </div>
    );
  }

  // ===========================================
  // STAT CARDS & TABLE RENDER (Exactly as your UI)
  // ===========================================
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage all platform users</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <button onClick={fetchUsers} className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Users', value: stats.totalUsers, accent: 'text-gray-900' },
          { label: 'Customers', value: stats.customers, accent: 'text-gray-900' },
          { label: 'Restaurant Owners', value: stats.owners, accent: 'text-gray-900' },
          { label: 'Delivery Agents', value: stats.agents, accent: 'text-gray-900' },
          { label: 'Pending Approvals', value: stats.pendingApprovals, accent: 'text-amber-600' },
        ].map((tile) => (
          <div key={tile.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-4">
            <p className="text-xs text-gray-400">{tile.label}</p>
            <p className={`text-2xl font-bold tabular-nums mt-0.5 ${tile.accent}`}>{tile.value}</p>
          </div>
        ))}
      </div>

      {/* Filters, Search Bar, and Table Render EXACTLY as you originally had them */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" placeholder="Search by name, email, or phone..." className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition cursor-pointer" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          <option value="customer">Customers</option>
          <option value="owner">Restaurant Owners</option>
          <option value="agent">Delivery Agents</option>
          <option value="admin">Admins</option>
        </select>
        <select className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition cursor-pointer" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Orders</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Spent</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map((user) => {
                const statusMeta = STATUS_META[user.status] || STATUS_META.inactive;
                return (
                  <tr key={user.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-linear-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">{user.fullName?.charAt(0) || 'U'}</div>
                        <div className="min-w-0"><div className="font-medium text-sm text-gray-800 truncate">{user.fullName}</div><div className="text-xs text-gray-400">ID: {user.id?.slice(-8) || 'N/A'}</div></div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="text-sm text-gray-600">{user.email}</div><div className="text-xs text-gray-400">{user.phone || 'No phone'}</div></td>
                    <td className="px-6 py-4"><span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${ROLE_TINT[user.role] || ROLE_TINT.customer}`}>{user.role}</span></td>
                    <td className="px-6 py-4"><span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusMeta.tint}`}>{statusMeta.icon}{user.status}</span></td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-800 tabular-nums">{user.orders || 0}</td>
                    <td className="px-6 py-4 text-sm font-medium text-orange-600 tabular-nums">৳{(user.totalSpent || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-400">{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4">
                      <div className="relative flex justify-end">
                        <button onClick={() => setShowActionMenu(showActionMenu === user.id ? null : user.id)} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><MoreVertical className="w-4 h-4 text-gray-400" /></button>
                        {showActionMenu === user.id && (
                          <div className="absolute right-0 top-9 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-10 overflow-hidden">
                            <button onClick={() => { setSelectedUser(user); setShowActionMenu(null); }} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"><Eye className="w-4 h-4" /> View Details</button>
                            {user.role !== 'admin' && (
                              <>
                                <div className="border-t border-gray-100" />
                                <button onClick={() => handleStatusChange(user.id, user.status === 'suspended' ? 'approved' : 'suspended')} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"><Ban className="w-4 h-4" /> {user.status === 'suspended' ? 'Reactivate User' : 'Suspend User'}</button>
                                <button onClick={() => setRoleChangeTarget(user)} className="w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"><Shield className="w-4 h-4" /> Change Role</button>
                                <div className="border-t border-gray-100" />
                                <button onClick={() => handleDeleteUser(user.id)} className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 className="w-4 h-4" /> Delete User</button>
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
        {filteredUsers.length === 0 && <div className="p-14 text-center"><UsersIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" /><p className="text-sm font-medium text-gray-600">No users found</p></div>}
      </div>
      <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} loading={loading} />
      
      {/* Modals omitted for brevity - they remain exactly as your original code */}
    </div>
  );
}