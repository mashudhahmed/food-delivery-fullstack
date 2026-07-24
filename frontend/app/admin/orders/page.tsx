'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Search, Download, RefreshCw, Eye, Filter, X, Package, Ban } from 'lucide-react';
import toast from 'react-hot-toast';

// ✅ Matches the FLAT shape actually returned by GET /admin/orders (adminService.getAllOrders),
// which maps { id, orderNumber, customerName, customerEmail, restaurantName, agentName, ... } —
// previously this interface expected nested customer/restaurant/deliveryAgent objects that
// never existed on the list response, so every row silently rendered "N/A".
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

// Full detail shape from GET /admin/orders/:id (adminService.getOrderDetails),
// which DOES return nested relations plus line items.
interface OrderDetail {
  id: string;
  status: string;
  totalAmount: number;
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  deliveryAddress: string;
  deliveryInstructions?: string;
  placedAt: string;
  paymentMethod?: string;
  customer?: { fullName: string; email: string; phone?: string };
  restaurant?: { name: string; address?: string };
  agent?: { fullName: string };
  items?: { id: string; name?: string; quantity: number; price: number }[];
}

const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.orders && Array.isArray(data.orders)) return data.orders;
  console.warn('⚠️ Unexpected data format for orders:', typeof data, data);
  return [];
};

const STATUS_META: Record<string, { text: string; color: string; ring: string; dot: string }> = {
  pending: { text: 'Order Placed', color: 'bg-amber-50 text-amber-700', ring: 'ring-amber-200', dot: 'bg-amber-500' },
  preparing: { text: 'Preparing', color: 'bg-blue-50 text-blue-700', ring: 'ring-blue-200', dot: 'bg-blue-500' },
  ready: { text: 'Ready for Pickup', color: 'bg-purple-50 text-purple-700', ring: 'ring-purple-200', dot: 'bg-purple-500' },
  picked_up: { text: 'Picked Up', color: 'bg-indigo-50 text-indigo-700', ring: 'ring-indigo-200', dot: 'bg-indigo-500' },
  on_the_way: { text: 'On the Way', color: 'bg-orange-50 text-orange-700', ring: 'ring-orange-200', dot: 'bg-orange-500' },
  delivered: { text: 'Delivered', color: 'bg-gray-100 text-gray-600', ring: 'ring-gray-200', dot: 'bg-gray-400' },
  cancelled: { text: 'Cancelled', color: 'bg-red-50 text-red-700', ring: 'ring-red-200', dot: 'bg-red-500' },
};

// Order the statuses actually move through, so the "update status" dropdown
// only offers forward transitions (plus staying put) instead of any-to-any.
const STATUS_FLOW = ['pending', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered'];

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // ✅ Correct endpoint — GET /admin/orders (was calling /admin/orders/recent,
      // which doesn't exist on the backend and 404'd every time).
      const params = new URLSearchParams({ limit: '100' });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const response = await api.get(`/admin/orders?${params.toString()}`);
      setOrders(ensureArray(response.data));
    } catch (error) {
      toast.error('Failed to load orders');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const openOrderDetail = async (orderId: string) => {
    setDetailLoading(true);
    try {
      const response = await api.get(`/admin/orders/${orderId}`);
      setSelectedOrder(response.data);
    } catch (error) {
      toast.error('Failed to load order details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedOrder) return;
    setUpdatingStatus(true);
    try {
      await api.patch(`/admin/orders/${selectedOrder.id}/status`, { status: newStatus });
      toast.success(`Order status updated to ${getStatusMeta(newStatus).text}`);
      setSelectedOrder({ ...selectedOrder, status: newStatus });
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    const reason = prompt('Reason for cancelling this order:');
    if (!reason) return;
    try {
      await api.patch(`/admin/orders/${selectedOrder.id}/cancel`, { reason });
      toast.success('Order cancelled');
      setSelectedOrder({ ...selectedOrder, status: 'cancelled' });
      fetchOrders();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to cancel order');
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
        <div className="flex gap-2">
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

      {/* Filters */}
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

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/80 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Restaurant</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Placed At</th>
                <th className="px-6 py-3 text-right text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <Package className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-600">No orders found</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const statusMeta = getStatusMeta(order.status);
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50/60 cursor-pointer transition-colors"
                      onClick={() => openOrderDetail(order.id)}
                    >
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
                        <div className="flex justify-end">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openOrderDetail(order.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition"
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

      {/* Order Detail Modal */}
      {(selectedOrder || detailLoading) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Order Details</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {detailLoading || !selectedOrder ? (
              <div className="p-10 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs text-gray-400">Order ID</p>
                    <p className="font-mono text-sm text-gray-800">{selectedOrder.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Customer</p>
                    <p className="font-medium text-sm text-gray-800">{selectedOrder.customer?.fullName}</p>
                    <p className="text-sm text-gray-500">{selectedOrder.customer?.email}</p>
                    <p className="text-sm text-gray-500">{selectedOrder.customer?.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Restaurant</p>
                    <p className="font-medium text-sm text-gray-800">{selectedOrder.restaurant?.name}</p>
                    <p className="text-sm text-gray-500">{selectedOrder.restaurant?.address}</p>
                  </div>
                  {selectedOrder.agent?.fullName && (
                    <div>
                      <p className="text-xs text-gray-400">Delivery Agent</p>
                      <p className="font-medium text-sm text-gray-800">{selectedOrder.agent.fullName}</p>
                    </div>
                  )}
                  {selectedOrder.items && selectedOrder.items.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-1">Items</p>
                      <div className="space-y-1">
                        {selectedOrder.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm text-gray-700">
                            <span>{item.quantity}x {item.name || 'Item'}</span>
                            <span>৳{item.price}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-400">Subtotal</p>
                      <p className="text-sm text-gray-700">৳{selectedOrder.subtotal}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Delivery Fee</p>
                      <p className="text-sm text-gray-700">৳{selectedOrder.deliveryFee}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Total Amount</p>
                    <p className="text-2xl font-bold text-orange-600 tabular-nums">৳{selectedOrder.totalAmount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Status</p>
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ring-1 ring-inset ${getStatusMeta(selectedOrder.status).color} ${getStatusMeta(selectedOrder.status).ring}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusMeta(selectedOrder.status).dot}`} />
                      {getStatusMeta(selectedOrder.status).text}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Placed At</p>
                    <p className="text-sm text-gray-700">
                      {selectedOrder.placedAt ? new Date(selectedOrder.placedAt).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>

                {/* ✅ Real status-update and cancel actions — previously this modal was read-only */}
                {selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                  <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 space-y-2.5">
                    <div className="flex gap-2">
                      <select
                        disabled={updatingStatus}
                        defaultValue=""
                        onChange={(e) => e.target.value && handleUpdateStatus(e.target.value)}
                        className="flex-1 px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 disabled:opacity-50"
                      >
                        <option value="" disabled>Move to next status...</option>
                        {STATUS_FLOW.filter(
                          (s) => STATUS_FLOW.indexOf(s) > STATUS_FLOW.indexOf(selectedOrder.status),
                        ).map((s) => (
                          <option key={s} value={s}>{getStatusMeta(s).text}</option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleCancelOrder}
                      className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2.5 rounded-xl text-sm font-medium hover:bg-red-100 transition"
                    >
                      <Ban className="w-4 h-4" />
                      Cancel Order
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}