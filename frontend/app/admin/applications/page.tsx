'use client';

import { useEffect, useState } from 'react';
import { api } from '@/app/lib/api';
import { Eye, CheckCircle, XCircle, Download, RefreshCw } from 'lucide-react';
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
  vehicleNumber?: string;
  drivingLicense?: string;
  createdAt: string;
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await api.get('/admin/pending-approvals');
      setApplications(response.data);
    } catch (error) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string, role: string) => {
    try {
      await api.patch(`/admin/approve/${userId}`, { role });
      toast.success('Application approved successfully');
      fetchApplications();
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
      fetchApplications();
      setSelectedApp(null);
    } catch (error) {
      toast.error('Failed to reject application');
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/admin/export/applications', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `applications_${new Date().toISOString()}.csv`);
      link.click();
      link.remove();
      toast.success('Applications exported successfully');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  const getStatusColor = (role: string) => {
    return role === 'owner' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800';
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Pending Applications</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button onClick={fetchApplications} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applied Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-800">{app.fullName}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{app.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{app.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(app.role)}`}>
                      {app.role === 'owner' ? 'Restaurant Owner' : 'Delivery Agent'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="p-1.5 text-gray-400 hover:text-gray-600"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleApprove(app.id, app.role)}
                        className="p-1.5 text-green-500 hover:text-green-600"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(app.id)}
                        className="p-1.5 text-red-500 hover:text-red-600"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {applications.length === 0 && (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-500">No pending applications</p>
          </div>
        )}
      </div>

      {/* Modal - same as before */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">Application Details</h3>
              <button onClick={() => setSelectedApp(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-sm text-gray-500">Full Name</p><p className="font-medium">{selectedApp.fullName}</p></div>
                <div><p className="text-sm text-gray-500">Role</p><p className="font-medium capitalize">{selectedApp.role}</p></div>
                <div><p className="text-sm text-gray-500">Email</p><p className="font-medium break-all">{selectedApp.email}</p></div>
                <div><p className="text-sm text-gray-500">Phone</p><p className="font-medium">{selectedApp.phone}</p></div>
              </div>
              {selectedApp.businessName && <div><p className="text-sm text-gray-500">Business Name</p><p className="font-medium">{selectedApp.businessName}</p></div>}
              {selectedApp.businessAddress && <div><p className="text-sm text-gray-500">Business Address</p><p className="font-medium">{selectedApp.businessAddress}</p></div>}
              {selectedApp.nidNumber && <div><p className="text-sm text-gray-500">NID Number</p><p className="font-medium">{selectedApp.nidNumber}</p></div>}
              {selectedApp.vehicleType && (
                <>
                  <div><p className="text-sm text-gray-500">Vehicle Type</p><p className="font-medium">{selectedApp.vehicleType}</p></div>
                  <div><p className="text-sm text-gray-500">Vehicle Number</p><p className="font-medium">{selectedApp.vehicleNumber}</p></div>
                  <div><p className="text-sm text-gray-500">Driving License</p><p className="font-medium">{selectedApp.drivingLicense}</p></div>
                </>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-3">
              <button onClick={() => handleApprove(selectedApp.id, selectedApp.role)} className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 transition">Approve</button>
              <button onClick={() => handleReject(selectedApp.id)} className="flex-1 bg-red-500 text-white py-2 rounded-lg font-medium hover:bg-red-600 transition">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}