'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/app/lib/api';
import { api } from '@/app/lib/api';
import { Users, Store, Package, CheckCircle, XCircle, Clock, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

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
  createdAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [pendingApplications, setPendingApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    restaurants: 0,
    orders: 0,
    pendingOwners: 0,
    pendingAgents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser || currentUser.role !== 'admin') {
      router.push('/');
      return;
    }
    setUser(currentUser);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pendingRes, statsRes] = await Promise.all([
        api.get('/admin/pending-approvals'),
        api.get('/admin/users/count'),
      ]);
      setPendingApplications(pendingRes.data);
      setStats({
        totalUsers: statsRes.data.totalUsers,
        restaurants: statsRes.data.owners,
        orders: 0,
        pendingOwners: pendingRes.data.filter((a: Application) => a.role === 'owner').length,
        pendingAgents: pendingRes.data.filter((a: Application) => a.role === 'agent').length,
      });
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string, role: string) => {
    try {
      await api.patch(`/admin/approve/${userId}`, { role });
      toast.success('Application approved successfully');
      fetchData();
      setSelectedApp(null);
    } catch (error) {
      toast.error('Failed to approve application');
    }
  };

  const handleReject = async (userId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    try {
      await api.patch(`/admin/reject/${userId}`, { reason });
      toast.success('Application rejected');
      fetchData();
      setSelectedApp(null);
    } catch (error) {
      toast.error('Failed to reject application');
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
        <p className="text-gray-600">Welcome back, {user?.fullName}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Users</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
            <Users className="w-10 h-10 text-orange-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Restaurants</p>
              <p className="text-2xl font-bold">{stats.restaurants}</p>
            </div>
            <Store className="w-10 h-10 text-green-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Owners</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pendingOwners}</p>
            </div>
            <Clock className="w-10 h-10 text-yellow-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Pending Agents</p>
              <p className="text-2xl font-bold text-blue-600">{stats.pendingAgents}</p>
            </div>
            <Clock className="w-10 h-10 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Orders</p>
              <p className="text-2xl font-bold">{stats.orders}</p>
            </div>
            <Package className="w-10 h-10 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Pending Applications Section */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold">Pending Applications</h2>
          <p className="text-sm text-gray-500">Review and approve restaurant owner or delivery agent applications</p>
        </div>

        {pendingApplications.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <p className="text-gray-500">No pending applications</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {pendingApplications.map((app) => (
              <div key={app.id} className="p-6 hover:bg-gray-50 transition">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{app.fullName}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        app.role === 'owner' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {app.role === 'owner' ? 'Restaurant Owner' : 'Delivery Agent'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">📧 {app.email}</p>
                    <p className="text-sm text-gray-600">📞 {app.phone}</p>
                    {app.businessName && (
                      <p className="text-sm text-gray-600 mt-1">🏪 {app.businessName}</p>
                    )}
                    {app.vehicleType && (
                      <p className="text-sm text-gray-600 mt-1">🛵 {app.vehicleType}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      Applied: {new Date(app.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedApp(app)}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                      <Eye className="w-4 h-4 inline mr-1" />
                      Review
                    </button>
                    <button
                      onClick={() => handleApprove(app.id, app.role)}
                      className="px-3 py-1 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                    >
                      <CheckCircle className="w-4 h-4 inline mr-1" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleReject(app.id)}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      <XCircle className="w-4 h-4 inline mr-1" />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold">Application Details</h3>
                <button onClick={() => setSelectedApp(null)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium">{selectedApp.fullName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{selectedApp.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{selectedApp.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium capitalize">{selectedApp.role}</p>
                </div>
                {selectedApp.businessName && (
                  <div>
                    <p className="text-sm text-gray-500">Business Name</p>
                    <p className="font-medium">{selectedApp.businessName}</p>
                  </div>
                )}
                {selectedApp.businessAddress && (
                  <div>
                    <p className="text-sm text-gray-500">Business Address</p>
                    <p className="font-medium">{selectedApp.businessAddress}</p>
                  </div>
                )}
                {selectedApp.nidNumber && (
                  <div>
                    <p className="text-sm text-gray-500">NID Number</p>
                    <p className="font-medium">{selectedApp.nidNumber}</p>
                  </div>
                )}
                {selectedApp.vehicleType && (
                  <div>
                    <p className="text-sm text-gray-500">Vehicle Type</p>
                    <p className="font-medium">{selectedApp.vehicleType}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => handleApprove(selectedApp.id, selectedApp.role)}
                  className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600"
                >
                  Approve Application
                </button>
                <button
                  onClick={() => handleReject(selectedApp.id)}
                  className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600"
                >
                  Reject Application
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}