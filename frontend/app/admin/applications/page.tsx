'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import {
  Eye,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  ClipboardList,
  Search,
  Store,
  Bike,
  AlertTriangle,
  X,
  FileText,
  Loader2,
  Building2,
  ShieldCheck,
  Calendar,
  Mail,
  Phone,
  FileBadge,
} from 'lucide-react';
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

const PRESET_REJECTION_REASONS = [
  'Incomplete or illegible KYC documents (NID / Trade License)',
  'Invalid or expired driving license / vehicle papers',
  'Operating address or kitchen hygiene check could not be verified',
  'Duplicate partner application or unreachable phone number',
  'Does not meet minimum platform requirements',
];

const ensureArray = (data: unknown): Application[] => {
  if (Array.isArray(data)) return data as Application[];

  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if ('users' in record && Array.isArray(record.users)) {
      return record.users as Application[];
    }
    if ('data' in record && Array.isArray(record.data)) {
      return record.data as Application[];
    }
    if ('items' in record && Array.isArray(record.items)) {
      return record.items as Application[];
    }
  }

  console.warn('⚠️ Unexpected data format for applications:', typeof data, data);
  return [];
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'owner' | 'agent'>('all');

  // Modals state
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [rejectingApp, setRejectingApp] = useState<Application | null>(null);
  const [selectedReasonPreset, setSelectedReasonPreset] = useState(PRESET_REJECTION_REASONS[0]);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApplications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/pending-approvals');
      setApplications(ensureArray(response.data));
    } catch (error) {
      console.error('Failed to load applications:', error);
      toast.error('Failed to load applications');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedApp(null);
        setRejectingApp(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleApprove = async (userId: string, role: string) => {
    setActionLoading(true);
    try {
      await api.patch(`/admin/approve/${userId}`, { role });
      toast.success('Application approved successfully');
      setApplications((prev) => prev.filter((a) => a.id !== userId));
      setSelectedApp(null);
    } catch (error) {
      console.error('Failed to approve application:', error);
      toast.error('Failed to approve application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRejectModal = (app: Application) => {
    setRejectingApp(app);
    setSelectedReasonPreset(PRESET_REJECTION_REASONS[0]);
    setRejectionNotes('');
  };

  const handleConfirmReject = async () => {
    if (!rejectingApp) return;

    const finalReason = rejectionNotes.trim()
      ? `${selectedReasonPreset}: ${rejectionNotes.trim()}`
      : selectedReasonPreset;

    if (finalReason.length < 3) {
      toast.error('Please provide a valid rejection reason');
      return;
    }

    setActionLoading(true);
    try {
      await api.patch(`/admin/reject/${rejectingApp.id}`, { reason: finalReason });
      toast.success('Application rejected');
      setApplications((prev) => prev.filter((a) => a.id !== rejectingApp.id));
      setRejectingApp(null);
      if (selectedApp?.id === rejectingApp.id) {
        setSelectedApp(null);
      }
    } catch (error) {
      console.error('Failed to reject application:', error);
      toast.error('Failed to reject application');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/admin/export/applications', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `partner_applications_${new Date().toISOString().split('T')[0]}.csv`);
      link.click();
      link.remove();
      toast.success('Applications exported successfully');
    } catch (error) {
      console.error('Failed to export applications:', error);
      toast.error('Failed to export');
    }
  };

  const ownerCount = useMemo(
    () => applications.filter((a) => a.role === 'owner').length,
    [applications]
  );
  const agentCount = useMemo(
    () => applications.filter((a) => a.role === 'agent').length,
    [applications]
  );

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const matchesTab = activeTab === 'all' || app.role === activeTab;
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        !term ||
        app.fullName?.toLowerCase().includes(term) ||
        app.email?.toLowerCase().includes(term) ||
        app.phone?.includes(term) ||
        app.businessName?.toLowerCase().includes(term) ||
        app.vehicleNumber?.toLowerCase().includes(term) ||
        app.nidNumber?.includes(term);

      return matchesTab && matchesSearch;
    });
  }, [applications, activeTab, searchTerm]);

  const getRoleTint = (role: string) =>
    role === 'owner'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
      : 'bg-blue-50 text-blue-700 border-blue-100';

  if (loading && applications.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
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
          <h1 className="text-2xl font-bold text-gray-900">Partner Applications</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and verify onboarding signups for restaurant merchants and delivery couriers
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
            onClick={fetchApplications}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Metric Summary Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Pending Review</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums mt-0.5">
              {applications.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <ClipboardList className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Restaurant Owners</p>
            <p className="text-2xl font-bold text-emerald-600 tabular-nums mt-0.5">
              {ownerCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Store className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium">Delivery Couriers</p>
            <p className="text-2xl font-bold text-blue-600 tabular-nums mt-0.5">
              {agentCount}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Bike className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-6">
        {/* Role Segmented Tabs */}
        <div className="inline-flex p-1 bg-gray-100/80 rounded-xl border border-gray-200/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'all'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            All Applications
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-gray-200/80 text-gray-700">
              {applications.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('owner')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'owner'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Store className="w-3.5 h-3.5 text-emerald-600" />
            Restaurant Owners
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
              {ownerCount}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('agent')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'agent'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            <Bike className="w-3.5 h-3.5 text-blue-600" />
            Delivery Couriers
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800">
              {agentCount}
            </span>
          </button>
        </div>

        {/* Live Search */}
        <div className="relative min-w-[260px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search applicant, business, vehicle..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Applicant
                </th>
                <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Key Verification Details
                </th>
                <th className="text-left px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="text-right px-6 py-3.5 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredApplications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4">
                    <div
                      onClick={() => setSelectedApp(app)}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 group-hover:scale-105 transition-transform shadow-xs ${
                          app.role === 'owner'
                            ? 'bg-linear-to-br from-emerald-500 to-teal-600'
                            : 'bg-linear-to-br from-blue-500 to-indigo-600'
                        }`}
                      >
                        {app.fullName?.charAt(0)?.toUpperCase() || 'P'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 group-hover:text-orange-600 transition truncate">
                          {app.fullName}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                          ID: {app.id?.slice(0, 8)}...
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 truncate max-w-[200px]">{app.email}</div>
                    <div className="text-xs text-gray-400">{app.phone || 'No phone'}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium border ${getRoleTint(
                        app.role
                      )}`}
                    >
                      {app.role === 'owner' ? (
                        <>
                          <Store className="w-3 h-3" /> Restaurant Owner
                        </>
                      ) : (
                        <>
                          <Bike className="w-3 h-3" /> Delivery Agent
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {app.role === 'owner' ? (
                      <div>
                        <p className="text-xs font-medium text-gray-800">
                          {app.businessName || 'Business Name Pending'}
                        </p>
                        <p className="text-xs text-gray-400 truncate max-w-[220px]">
                          {app.businessAddress || (app.nidNumber ? `NID: ${app.nidNumber}` : 'Standard verification')}
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-medium text-gray-800">
                          {app.vehicleType ? `${app.vehicleType} • ${app.vehicleNumber || 'No Plate'}` : 'Vehicle Details Pending'}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">
                          {app.drivingLicense ? `Lic: ${app.drivingLicense}` : 'License submitted'}
                        </p>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-400">
                    {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : 'Recent'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1.5 justify-end items-center">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
                        title="View Full Application"
                        aria-label="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleApprove(app.id, app.role)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer disabled:opacity-50"
                        title="Approve Application"
                        aria-label="Approve"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        disabled={actionLoading}
                        onClick={() => handleOpenRejectModal(app)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-50"
                        title="Reject Application"
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

        {filteredApplications.length === 0 && (
          <div className="p-14 text-center">
            <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-600">No applications match your criteria</p>
            <p className="text-xs text-gray-400 mt-1">
              {applications.length === 0
                ? 'All partner signups have been reviewed and processed.'
                : 'Try adjusting your search query or tab filter.'}
            </p>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 1. APPLICATION DETAILS DRAWER / MODAL                    */}
      {/* ======================================================== */}
      {selectedApp && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedApp(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-5 flex justify-between items-center z-10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs ${
                    selectedApp.role === 'owner'
                      ? 'bg-linear-to-br from-emerald-500 to-teal-600'
                      : 'bg-linear-to-br from-blue-500 to-indigo-600'
                  }`}
                >
                  {selectedApp.fullName?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">{selectedApp.fullName}</h3>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize border ${getRoleTint(
                        selectedApp.role
                      )}`}
                    >
                      {selectedApp.role === 'owner' ? 'Restaurant Owner' : 'Delivery Agent'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Application ID: {selectedApp.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-700 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Contact Information */}
              <div className="bg-gray-50/70 rounded-xl p-4 border border-gray-100 space-y-2.5">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <span className="truncate">{selectedApp.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>{selectedApp.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                    <span>
                      Applied:{' '}
                      {selectedApp.createdAt
                        ? new Date(selectedApp.createdAt).toLocaleDateString()
                        : 'Recent'}
                    </span>
                  </div>
                  {selectedApp.nidNumber && (
                    <div className="flex items-center gap-2 text-gray-700">
                      <FileBadge className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="font-mono">NID: {selectedApp.nidNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Role-Specific Information */}
              {selectedApp.role === 'owner' ? (
                <div className="bg-emerald-50/40 rounded-xl p-4 border border-emerald-100/80 space-y-3">
                  <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Store className="w-4 h-4" /> Restaurant Merchant Info
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-emerald-700 font-medium">Business / Trade Name</p>
                      <p className="font-semibold text-gray-900 mt-0.5">
                        {selectedApp.businessName || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-emerald-700 font-medium">Commercial Address</p>
                      <p className="text-gray-700 mt-0.5">
                        {selectedApp.businessAddress || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50/40 rounded-xl p-4 border border-blue-100/80 space-y-3">
                  <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Bike className="w-4 h-4" /> Courier &amp; Vehicle Registration
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-blue-700 font-medium">Vehicle Type</p>
                      <p className="font-semibold text-gray-900 capitalize mt-0.5">
                        {selectedApp.vehicleType || 'Not specified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-blue-700 font-medium">Registration Number</p>
                      <p className="font-mono font-medium text-gray-900 mt-0.5">
                        {selectedApp.vehicleNumber || 'Not specified'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-blue-700 font-medium">Driving License</p>
                      <p className="font-mono font-medium text-gray-900 mt-0.5">
                        {selectedApp.drivingLicense || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* KYC Verification Checklist Status */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> KYC Verification Checklist
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
                    <span className="text-gray-600">Identity (NID)</span>
                    <span className={`font-semibold ${selectedApp.nidNumber ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {selectedApp.nidNumber ? 'Provided' : 'Pending'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
                    <span className="text-gray-600">Phone Contact</span>
                    <span className="font-semibold text-emerald-600">Verified</span>
                  </div>
                  {selectedApp.role === 'owner' ? (
                    <div className="col-span-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
                      <span className="text-gray-600">Merchant Premise Address</span>
                      <span className={`font-semibold ${selectedApp.businessAddress ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {selectedApp.businessAddress ? 'Submitted' : 'Pending'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
                        <span className="text-gray-600">Driving License</span>
                        <span className={`font-semibold ${selectedApp.drivingLicense ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {selectedApp.drivingLicense ? 'Provided' : 'Pending'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
                        <span className="text-gray-600">Vehicle Papers</span>
                        <span className={`font-semibold ${selectedApp.vehicleNumber ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {selectedApp.vehicleNumber ? 'Provided' : 'Pending'}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-3">
              <button
                disabled={actionLoading}
                onClick={() => handleApprove(selectedApp.id, selectedApp.role)}
                className="flex-1 bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-600 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Approve Partner
              </button>
              <button
                disabled={actionLoading}
                onClick={() => handleOpenRejectModal(selectedApp)}
                className="flex-1 bg-rose-50 text-rose-700 border border-rose-200 py-2.5 rounded-xl text-sm font-medium hover:bg-rose-100 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                Reject Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. PRODUCTION REJECTION MODAL (REPLACES WINDOW.PROMPT)   */}
      {/* ======================================================== */}
      {rejectingApp && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setRejectingApp(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Reject Application</h3>
                  <p className="text-xs text-gray-500">
                    Applicant: {rejectingApp.fullName} ({rejectingApp.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRejectingApp(null)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="my-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Standard Rejection Reason
                </label>
                <select
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 bg-white cursor-pointer"
                  value={selectedReasonPreset}
                  onChange={(e) => setSelectedReasonPreset(e.target.value)}
                >
                  {PRESET_REJECTION_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                  Administrative Notes / Feedback for Applicant
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide specific notes (e.g. please upload a clearer photograph of your driving license)..."
                  className="w-full px-3.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition resize-none"
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                />
              </div>

              <div className="p-3 bg-rose-50/60 rounded-xl border border-rose-100 text-[11px] text-rose-700 leading-relaxed">
                This notice will be recorded in the audit trail. The applicant status will be updated to rejected and they will be able to review the reasoning if contacting support.
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingApp(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-rose-600 text-white hover:bg-rose-700 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}