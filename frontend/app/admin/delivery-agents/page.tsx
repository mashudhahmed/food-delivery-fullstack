'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, Download, RefreshCw, Truck, Star, Phone, Mail, Car, X, CheckCircle, Ban, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface DeliveryAgent {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  vehicleType: string;
  vehicleNumber: string;
  drivingLicense: string;
  // ✅ Real UserStatus values from the backend enum: pending | approved | rejected | suspended
  // (there is no 'active' status — that was the bug)
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  isActive?: boolean; // computed by the backend as status === 'approved'
  totalDeliveries: number;
  rating: number;
  createdAt: string;
}

const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.agents && Array.isArray(data.agents)) return data.agents;
  console.warn('⚠️ Unexpected data format for delivery agents:', typeof data, data);
  return [];
};

const STATUS_TINT: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  suspended: 'bg-red-50 text-red-700',
  rejected: 'bg-gray-100 text-gray-600',
};

export default function DeliveryAgentsPage() {
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<DeliveryAgent | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/delivery-agents');
      setAgents(ensureArray(response.data));
    } catch (error) {
      toast.error('Failed to load delivery agents');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // ✅ Backend now accepts 'delivery-agents' as an export type alias (see admin.service.ts)
      const response = await api.get('/admin/export/delivery-agents', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `delivery_agents_${new Date().toISOString()}.csv`);
      link.click();
      link.remove();
      toast.success('Delivery agents exported successfully');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  // ✅ New — wires up PATCH /admin/delivery-agents/:id/status, which existed on
  // the backend with no frontend control at all.
  const handleStatusChange = async (agentId: string, status: string) => {
    setSavingStatus(true);
    try {
      await api.patch(`/admin/delivery-agents/${agentId}/status`, { status });
      toast.success(`Agent status updated to ${status}`);
      setSelectedAgent((prev) => (prev ? { ...prev, status: status as DeliveryAgent['status'] } : prev));
      fetchAgents();
    } catch (error) {
      toast.error('Failed to update agent status');
    } finally {
      setSavingStatus(false);
    }
  };

  // ✅ New — wires up PATCH /admin/delivery-agents/:id/verify-document
  const handleVerifyDocument = async (agentId: string, documentType: string) => {
    try {
      await api.patch(`/admin/delivery-agents/${agentId}/verify-document`, {
        documentType,
        verified: true,
      });
      toast.success(`${documentType} verified`);
    } catch (error) {
      toast.error(`Failed to verify ${documentType}`);
    }
  };

  const safeAgents = Array.isArray(agents) ? agents : [];

  const filteredAgents = safeAgents.filter(
    (agent) =>
      agent.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.phone?.includes(searchTerm) ||
      agent.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ✅ Was checking a.status === 'active', which never matches the real enum
  // (pending/approved/rejected/suspended) — agents always showed as inactive.
  const activeCount = safeAgents.filter((a) => a.status === 'approved').length;
  const avgRating = safeAgents.length ? safeAgents.reduce((acc, a) => acc + (a.rating || 0), 0) / safeAgents.length : 0;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-2xl border border-gray-100" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 bg-gray-100 rounded-2xl border border-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Delivery Agents</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your fleet of delivery agents</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="px-3.5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={fetchAgents}
            className="px-3.5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-5">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 text-blue-600">
              <Truck className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs text-gray-400">Total Agents</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{safeAgents.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-5">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600">
              <Truck className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs text-gray-400">Active Agents</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-5">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-amber-50 text-amber-600">
              <Star className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs text-gray-400">Average Rating</p>
              <p className="text-xl font-bold text-gray-900 tabular-nums">{avgRating.toFixed(1)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      {filteredAgents.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2">
          <Truck className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">No delivery agents found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAgents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden hover:shadow-md hover:shadow-black/4 transition-shadow cursor-pointer"
              onClick={() => setSelectedAgent(agent)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-linear-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold shrink-0">
                      {agent.fullName?.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm text-gray-900">{agent.fullName}</h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-xs text-gray-500">{agent.rating || 'New'}</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 capitalize ${
                      STATUS_TINT[agent.status] || STATUS_TINT.rejected
                    }`}
                  >
                    {agent.status}
                  </span>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Phone className="w-3.5 h-3.5 shrink-0 text-gray-300" />
                    <span>{agent.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Mail className="w-3.5 h-3.5 shrink-0 text-gray-300" />
                    <span className="truncate">{agent.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Car className="w-3.5 h-3.5 shrink-0 text-gray-300" />
                    <span>
                      {agent.vehicleType} • {agent.vehicleNumber}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-gray-400">Deliveries: </span>
                    <span className="font-semibold text-gray-800">{agent.totalDeliveries || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Joined: </span>
                    <span className="font-semibold text-gray-800">
                      {agent.createdAt ? new Date(agent.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Agent Details</h3>
              <button onClick={() => setSelectedAgent(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <div className="w-14 h-14 rounded-full bg-linear-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-xl">
                  {selectedAgent.fullName?.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{selectedAgent.fullName}</h4>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${STATUS_TINT[selectedAgent.status] || STATUS_TINT.rejected}`}>
                    {selectedAgent.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400">Phone</p>
                  <p className="font-medium text-sm text-gray-800">{selectedAgent.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="font-medium text-sm text-gray-800 break-all">{selectedAgent.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Vehicle Type</p>
                  <p className="font-medium text-sm text-gray-800">{selectedAgent.vehicleType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Vehicle Number</p>
                  <p className="font-medium text-sm text-gray-800">{selectedAgent.vehicleNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Driving License</p>
                  <p className="font-medium text-sm text-gray-800">{selectedAgent.drivingLicense}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Total Deliveries</p>
                  <p className="font-medium text-sm text-gray-800">{selectedAgent.totalDeliveries || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Rating</p>
                  <p className="font-medium text-sm text-gray-800 flex items-center gap-1">
                    {selectedAgent.rating || 'New'}
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Joined Date</p>
                  <p className="font-medium text-sm text-gray-800">
                    {selectedAgent.createdAt ? new Date(selectedAgent.createdAt).toLocaleDateString() : 'N/A'}
                  </p>
                </div>
              </div>

              {/* ✅ New — document verification, previously backend-only with no UI */}
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 mb-2">Verify Documents</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerifyDocument(selectedAgent.id, 'drivingLicense')}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verify License
                  </button>
                  <button
                    onClick={() => handleVerifyDocument(selectedAgent.id, 'vehicleRegistration')}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verify Vehicle
                  </button>
                </div>
              </div>
            </div>

            {/* ✅ New — status actions, previously backend-only with no UI */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-2">
              {selectedAgent.status !== 'approved' && (
                <button
                  disabled={savingStatus}
                  onClick={() => handleStatusChange(selectedAgent.id, 'approved')}
                  className="flex-1 flex items-center justify-center gap-2 bg-emerald-500 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-600 transition disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
              )}
              {selectedAgent.status !== 'suspended' && (
                <button
                  disabled={savingStatus}
                  onClick={() => handleStatusChange(selectedAgent.id, 'suspended')}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-100 transition disabled:opacity-50"
                >
                  <Ban className="w-4 h-4" />
                  Suspend
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}