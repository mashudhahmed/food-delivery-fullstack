'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Search, Download, RefreshCw, Eye, Filter, X, Package, Ban, Truck, Radio, SlidersHorizontal, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import { unwrapPaginated } from '@/lib/unwrapPaginated';

interface DeliveryAgent {
  id: string;
  fullName: string;
  phone?: string;
  vehicleType?: string;
  status: string;
}

interface OrderListItem {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  restaurantName?: string;
  agentName?: string;
  totalAmount: number;
  status: string;
  placedAt: string;
  paymentMethod?: string;
}

const STATUS_META: Record<string, { text: string; color: string; ring: string; dot: string }> = {
  pending: { text: 'Order Placed', color: 'bg-amber-50 text-amber-700', ring: 'ring-amber-200', dot: 'bg-amber-500' },
  preparing: { text: 'Preparing', color: 'bg-blue-50 text-blue-700', ring: 'ring-blue-200', dot: 'bg-blue-500' },
  ready: { text: 'Ready for Pickup', color: 'bg-purple-50 text-purple-700', ring: 'ring-purple-200', dot: 'bg-purple-500' },
  picked_up: { text: 'Picked Up', color: 'bg-indigo-50 text-indigo-700', ring: 'ring-indigo-200', dot: 'bg-indigo-500' },
  on_the_way: { text: 'On the Way', color: 'bg-orange-50 text-orange-700', ring: 'ring-orange-200', dot: 'bg-orange-500' },
  delivered: { text: 'Delivered', color: 'bg-gray-100 text-gray-600', ring: 'ring-gray-200', dot: 'bg-gray-400' },
  cancelled: { text: 'Cancelled', color: 'bg-red-50 text-red-700', ring: 'ring-red-200', dot: 'bg-red-500' },
};

const STATUS_FLOW = ['pending', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered'];

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Operational State
  const [isLive, setIsLive] = useState(false);
  const [agents, setAgents] = useState<DeliveryAgent[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderListItem | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [cancelReason, setCancelReason] = useState<string>('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, page]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // Live feed polling
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      fetchOrdersSilently();
    }, 15000);
    return () => clearInterval(interval);
  }, [isLive, statusFilter, page]);

  const fetchOrdersSilently = async () => {
    try {
      const params = new URLSearchParams({ limit: String(limit), page: String(page) });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await api.get(`/admin/orders?${params.toString()}`);
      const { items, total: t, totalPages: tp } = unwrapPaginated<OrderListItem>(response.data);
      setOrders(items);
      setTotal(t);
      setTotalPages(tp);
    } catch {
      // silent refresh fail
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await api.get('/admin/delivery-agents?status=approved&limit=100');
      const { items } = unwrapPaginated<DeliveryAgent>(response.data);
      setAgents(items);
    } catch {
      // ignore
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(limit), page: String(page) });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await api.get(`/admin/orders?${params.toString()}`);
      const { items, total: t, totalPages: tp } = unwrapPaginated<OrderListItem>(response.data);
      setOrders(items);
      setTotal(t);
      setTotalPages(tp);
    } catch (error) {
      toast.error('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const openOrderModal = (order: OrderListItem) => {
    setSelectedOrder(order);
    setNewStatus(order.status);
    setSelectedAgentId('');
    setCancelReason('');
    fetchAgents();
  };

  const handleUpdateStatus = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    try {
      await api.patch(`/admin/orders/${selectedOrder.id}/status`, { status: newStatus });
      toast.success(`Order status updated to ${newStatus}`);
      setSelectedOrder(null);
      fetchOrders();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssignAgent = async () => {
    if (!selectedOrder || !selectedAgentId) {
      toast.error('Please select an agent to assign');
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(`/orders/${selectedOrder.id}/assign`, { agentId: selectedAgentId });
      toast.success('Agent assigned successfully');
      setSelectedOrder(null);
      fetchOrders();
    } catch {
      toast.error('Failed to assign agent');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }
    setActionLoading(true);
    try {
      await api.patch(`/admin/orders/${selectedOrder.id}/cancel`, { reason: cancelReason });
      toast.success('Order cancelled');
      setSelectedOrder(null);
      setCancelReason('');
      fetchOrders();
    } catch {
      toast.error('Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/admin/export/orders', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders_${new Date().toISOString()}.csv`);
      link.click();
      link.remove();
      toast.success('Orders exported successfully');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  const getStatusMeta = (status: string) => STATUS_META[status] || STATUS_META.pending;

  const safeOrders = Array.isArray(orders) ? orders : [];

  const filteredOrders = safeOrders.filter((order) => {
    const term = searchTerm.toLowerCase();
    return (
      order.id?.toLowerCase().includes(term) ||
      order.orderNumber?.toLowerCase().includes(term) ||
      order.customerName?.toLowerCase().includes(term) ||
      order.restaurantName?.toLowerCase().includes(term)
    );
  });

  const statusOptions = ['all', 'pending', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered', 'cancelled'];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="h-10 w-96 bg-gray-100 rounded-xl" />
        <div className="h-96 bg-gray-100 rounded-2xl border border-gray-100" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders Management</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor all orders across the platform</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`px-3 py-2 text-sm font-medium rounded-xl flex items-center gap-2 transition ${
              isLive
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <Radio className={`w-4 h-4 ${isLive ? 'animate-pulse text-emerald-600' : 'text-gray-400'}`} />
            <span>{isLive ? 'Live Feed (15s)' : 'Live Feed'}</span>
          </button>
          <button
            onClick={handleExport}
            className="px-3.5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={fetchOrders}
            className="px-3.5 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 flex items-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by order ID, customer, or restaurant..."
            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition cursor-pointer"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status === 'all' ? 'All Orders' : getStatusMeta(status).text}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Restaurant</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Placed At</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-600">No orders found</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusMeta = getStatusMeta(order.status);
                  return (
                    <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono text-sm font-semibold text-gray-800">
                          {order.orderNumber || `#${order.id?.slice(-8).toUpperCase()}`}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-800">{order.customerName || 'N/A'}</div>
                        <div className="text-xs text-gray-400">{order.customerEmail}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{order.restaurantName || 'N/A'}</td>
                      <td className="px-6 py-4">
                        {order.agentName ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full font-medium">
                            <Truck className="w-3.5 h-3.5" />
                            {order.agentName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 tabular-nums">৳{order.totalAmount}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ring-1 ring-inset ${statusMeta.color} ${statusMeta.ring}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                          {statusMeta.text}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {order.placedAt ? new Date(order.placedAt).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openOrderModal(order)}
                            className="p-1.5 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                            title="Manage & Dispatch"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => router.push(`/orders/${order.id}`)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
                            title="View Full Page"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} loading={loading} />

      {/* Dispatch & Operations Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-4 border-b border-gray-100 mb-5">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Order {selectedOrder.orderNumber || `#${selectedOrder.id?.slice(-8).toUpperCase()}`}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Placed {selectedOrder.placedAt ? new Date(selectedOrder.placedAt).toLocaleString() : 'N/A'}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-xs text-gray-400 font-medium">Customer</p>
                  <p className="font-semibold text-gray-800">{selectedOrder.customerName || 'N/A'}</p>
                  <p className="text-xs text-gray-500 truncate">{selectedOrder.customerEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-medium">Restaurant</p>
                  <p className="font-semibold text-gray-800">{selectedOrder.restaurantName || 'N/A'}</p>
                  <p className="text-xs font-semibold text-gray-900 mt-1">Total: ৳{selectedOrder.totalAmount}</p>
                </div>
              </div>

              {/* Status Management */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Update Status
                </label>
                <div className="flex gap-2">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500"
                  >
                    {statusOptions.filter((s) => s !== 'all').map((s) => (
                      <option key={s} value={s}>
                        {getStatusMeta(s).text}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={actionLoading || newStatus === selectedOrder.status}
                    className="px-4 py-2 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 transition disabled:opacity-50 text-sm"
                  >
                    {actionLoading ? 'Saving...' : 'Update'}
                  </button>
                </div>
              </div>

              {/* Driver Assignment */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                  Assign Delivery Agent
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500"
                  >
                    <option value="">Select available agent...</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.fullName} ({agent.vehicleType || 'Courier'})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAssignAgent}
                    disabled={actionLoading || !selectedAgentId}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition disabled:opacity-50 text-sm flex items-center gap-1.5"
                  >
                    <Truck className="w-4 h-4" />
                    Assign
                  </button>
                </div>
                {selectedOrder.agentName && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    Currently assigned to: <span className="font-semibold text-gray-700">{selectedOrder.agentName}</span>
                  </p>
                )}
              </div>

              {/* Cancel Order */}
              {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                <div className="pt-3 border-t border-gray-100">
                  <label className="block text-xs font-semibold text-red-600 uppercase tracking-wider mb-2">
                    Cancel Order
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Reason for cancellation..."
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-red-200 rounded-xl focus:outline-none focus:border-red-400"
                    />
                    <button
                      onClick={handleCancelOrder}
                      disabled={actionLoading || !cancelReason.trim()}
                      className="px-3.5 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition disabled:opacity-50 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}