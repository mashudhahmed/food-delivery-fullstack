'use client';

import { useEffect, useState } from 'react';
import { api } from '@/app/lib/api';
import { Search, Download, RefreshCw, Truck, Star, Phone, Mail, Car } from 'lucide-react';
import toast from 'react-hot-toast';

interface DeliveryAgent {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  vehicleType: string;
  vehicleNumber: string;
  drivingLicense: string;
  status: string;
  totalDeliveries: number;
  rating: number;
  createdAt: string;
}

export default function DeliveryAgentsPage() {
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<DeliveryAgent | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await api.get('/admin/delivery-agents');
      setAgents(response.data);
    } catch (error) {
      toast.error('Failed to load delivery agents');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
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

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-red-100 text-red-800';
  };

  const filteredAgents = agents.filter(agent =>
    agent.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.phone.includes(searchTerm) ||
    agent.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-2xl font-bold text-gray-800">Delivery Agents</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button onClick={fetchAgents} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by name, phone, or email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Agents</p>
              <p className="text-2xl font-bold">{agents.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Truck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Agents</p>
              <p className="text-2xl font-bold">{agents.filter(a => a.status === 'active').length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Average Rating</p>
              <p className="text-2xl font-bold">
                {(agents.reduce((acc, a) => acc + a.rating, 0) / agents.length || 0).toFixed(1)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAgents.map((agent) => (
          <div
            key={agent.id}
            className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition cursor-pointer"
            onClick={() => setSelectedAgent(agent)}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-linear-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {agent.fullName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{agent.fullName}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm text-gray-600">{agent.rating || 'New'}</span>
                    </div>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(agent.status)}`}>
                  {agent.status}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  <span>{agent.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{agent.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Car className="w-4 h-4" />
                  <span>{agent.vehicleType} • {agent.vehicleNumber}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-gray-500">Deliveries: </span>
                  <span className="font-semibold">{agent.totalDeliveries || 0}</span>
                </div>
                <div className="text-sm">
                  <span className="text-gray-500">Joined: </span>
                  <span className="font-semibold">{new Date(agent.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No delivery agents found</p>
        </div>
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl max-w-lg w-full mx-4">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold">Agent Details</h3>
              <button onClick={() => setSelectedAgent(null)} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-gray-100">
                <div className="w-16 h-16 bg-linear-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  {selectedAgent.fullName.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-lg">{selectedAgent.fullName}</h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(selectedAgent.status)}`}>
                    {selectedAgent.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-medium">{selectedAgent.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium break-all">{selectedAgent.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vehicle Type</p>
                  <p className="font-medium">{selectedAgent.vehicleType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Vehicle Number</p>
                  <p className="font-medium">{selectedAgent.vehicleNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Driving License</p>
                  <p className="font-medium">{selectedAgent.drivingLicense}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Deliveries</p>
                  <p className="font-medium">{selectedAgent.totalDeliveries || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Rating</p>
                  <p className="font-medium flex items-center gap-1">
                    {selectedAgent.rating || 'New'}
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Joined Date</p>
                  <p className="font-medium">{new Date(selectedAgent.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}