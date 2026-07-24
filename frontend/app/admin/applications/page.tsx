'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Eye, CheckCircle, XCircle, Download, RefreshCw, ClipboardList } from 'lucide-react';
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

// ✅ Ensure array in case the API wraps the list in an object
const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.applications && Array.isArray(data.applications)) return data.applications;
  console.warn('⚠️ Unexpected data format for applications:', typeof data, data);
  return [];
};

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
      setApplications(ensureArray(response.data));
    } catch (error) {
      toast.error('Failed to load applications');
      setApplications([]);
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

  const getRoleTint = (role: string) => (role === 'owner' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700');

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="h-96 bg-gray-100 rounded-2xl border border-gray-100" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pending Applications</h1>
          <p className="text-sm text-gray-500 mt-1">Review and approve owner &amp; agent signups</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={fetchApplications}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Applicant</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Phone</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Applied</th>
                <th className="text-right px-6 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-800">{app.fullName}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{app.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{app.phone}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getRoleTint(app.role)}`}>
                      {app.role === 'owner' ? 'Restaurant Owner' : 'Delivery Agent'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">{new Date(app.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                        aria-label="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleApprove(app.id, app.role)}
                        className="p-1.5 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        aria-label="Approve"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleReject(app.id)}
                        className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        aria-label="Reject"
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
          <div className="p-14 text-center">
            <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">No pending applications</p>
            <p className="text-xs text-gray-400 mt-1">New signups will show up here for review.</p>
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Application Details</h3>
              <button onClick={() => setSelectedApp(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400">Full Name</p>
                  <p className="font-medium text-sm text-gray-800">{selectedApp.fullName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Role</p>
                  <p className="font-medium text-sm text-gray-800 capitalize">{selectedApp.role}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="font-medium text-sm text-gray-800 break-all">{selectedApp.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Phone</p>
                  <p className="font-medium text-sm text-gray-800">{selectedApp.phone}</p>
                </div>
              </div>
              {selectedApp.businessName && (
                <div>
                  <p className="text-xs text-gray-400">Business Name</p>
                  <p className="font-medium text-sm text-gray-800">{selectedApp.businessName}</p>
                </div>
              )}
              {selectedApp.businessAddress && (
                <div>
                  <p className="text-xs text-gray-400">Business Address</p>
                  <p className="font-medium text-sm text-gray-800">{selectedApp.businessAddress}</p>
                </div>
              )}
              {selectedApp.nidNumber && (
                <div>
                  <p className="text-xs text-gray-400">NID Number</p>
                  <p className="font-medium text-sm text-gray-800">{selectedApp.nidNumber}</p>
                </div>
              )}
              {selectedApp.vehicleType && (
                <>
                  <div>
                    <p className="text-xs text-gray-400">Vehicle Type</p>
                    <p className="font-medium text-sm text-gray-800">{selectedApp.vehicleType}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Vehicle Number</p>
                    <p className="font-medium text-sm text-gray-800">{selectedApp.vehicleNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Driving License</p>
                    <p className="font-medium text-sm text-gray-800">{selectedApp.drivingLicense}</p>
                  </div>
                </>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-3">
              <button
                onClick={() => handleApprove(selectedApp.id, selectedApp.role)}
                className="flex-1 bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-600 transition"
              >
                Approve
              </button>
              <button
                onClick={() => handleReject(selectedApp.id)}
                className="flex-1 bg-red-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-red-600 transition"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}