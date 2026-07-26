'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Star, Search, RefreshCw, Store, MapPin, Download, X, CheckCircle, ShieldCheck, Ban, Trash2, Phone, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/Pagination';
import { unwrapPaginated } from '@/lib/unwrapPaginated';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  phone?: string;
  description?: string;
  cuisineType?: string;
  rating?: number;
  isOpen: boolean;
  isVerified: boolean;
  imageUrl?: string;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  totalOrders?: number;
  totalRevenue?: number;
  createdAt: string;
}

interface RestaurantDetail extends Restaurant {
  completedOrders: number;
  averageOrderValue: number;
  recentOrders: {
    id: string;
    totalAmount: number;
    status: string;
    placedAt: string;
    customer?: { fullName: string };
  }[];
}

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // ✅ Pagination — was fetching the entire restaurant list in one request.
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // ✅ Quick-stat counts now come from a dedicated endpoint instead of being
  // computed from the (now partial) in-memory restaurants array.
  const [stats, setStats] = useState({ total: 0, open: 0, closed: 0, verified: 0 });

  useEffect(() => {
    fetchRestaurants();
  }, [page]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/restaurants/stats');
      const raw = response.data?.data ?? response.data;
      setStats((prev) => ({ ...prev, ...raw }));
    } catch (error) {
      console.error('Failed to load restaurant stats:', error);
    }
  };

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/restaurants?limit=${limit}&page=${page}`);
      const { items, total: t, totalPages: tp } = unwrapPaginated<Restaurant>(response.data);
      setRestaurants(items);
      setTotal(t);
      setTotalPages(tp);
    } catch (error) {
      toast.error('Failed to load restaurants');
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (restaurantId: string) => {
    setDetailLoading(true);
    try {
      const response = await api.get(`/admin/restaurants/${restaurantId}`);
      setSelectedRestaurant(response.data);
    } catch (error) {
      toast.error('Failed to load restaurant details');
    } finally {
      setDetailLoading(false);
    }
  };

  // ✅ New — wires PATCH /admin/restaurants/:id/status (open/close toggle)
  const handleToggleOpen = async (restaurant: Restaurant) => {
    setActionLoading(true);
    const nextStatus = restaurant.isOpen ? 'inactive' : 'active';
    try {
      await api.patch(`/admin/restaurants/${restaurant.id}/status`, { status: nextStatus });
      toast.success(`${restaurant.name} ${nextStatus === 'active' ? 'opened' : 'closed'}`);
      setRestaurants((prev) =>
        prev.map((r) => (r.id === restaurant.id ? { ...r, isOpen: nextStatus === 'active' } : r)),
      );
      setSelectedRestaurant((prev) => (prev && prev.id === restaurant.id ? { ...prev, isOpen: nextStatus === 'active' } : prev));
      fetchStats();
    } catch (error) {
      toast.error('Failed to update restaurant status');
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ New — wires PATCH /admin/restaurants/:id/verify
  const handleToggleVerify = async (restaurant: Restaurant) => {
    setActionLoading(true);
    const nextVerified = !restaurant.isVerified;
    try {
      await api.patch(`/admin/restaurants/${restaurant.id}/verify`, { verified: nextVerified });
      toast.success(`${restaurant.name} ${nextVerified ? 'verified' : 'unverified'}`);
      setRestaurants((prev) =>
        prev.map((r) => (r.id === restaurant.id ? { ...r, isVerified: nextVerified } : r)),
      );
      setSelectedRestaurant((prev) => (prev && prev.id === restaurant.id ? { ...prev, isVerified: nextVerified } : prev));
      fetchStats();
    } catch (error) {
      toast.error('Failed to update verification');
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ New — wires DELETE /admin/restaurants/:id (backend now soft-deletes)
  const handleDelete = async (restaurant: Restaurant) => {
    if (!confirm(`Delete "${restaurant.name}"? It will stop appearing everywhere on the platform immediately.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await api.delete(`/admin/restaurants/${restaurant.id}`);
      toast.success(`${restaurant.name} deleted`);
      setRestaurants((prev) => prev.filter((r) => r.id !== restaurant.id));
      setSelectedRestaurant(null);
      fetchStats();
      // Total count shrank — if this was the last item on the current page
      // (and we're not on page 1), step back a page instead of showing an
      // empty page with valid pages still behind it.
      if (restaurants.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchRestaurants();
      }
    } catch (error) {
      toast.error('Failed to delete restaurant');
    } finally {
      setActionLoading(false);
    }
  };

  // ✅ New — export button was entirely missing even though the backend
  // has supported type: 'restaurants' since it was first written.
  const handleExport = async () => {
    try {
      const response = await api.get('/admin/export/restaurants', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `restaurants_${new Date().toISOString()}.csv`);
      link.click();
      link.remove();
      toast.success('Restaurants exported successfully');
    } catch (error) {
      toast.error('Failed to export');
    }
  };

  // ⚠️ Search only refines the CURRENT page of results — with server-side
  // pagination there's no full in-memory restaurant list to search across.
  const filteredRestaurants = restaurants.filter(
    (r) => r.name?.toLowerCase().includes(searchTerm.toLowerCase()) || r.ownerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-2xl border border-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurants</h1>
          <p className="text-sm text-gray-500 mt-1">All restaurants on the platform</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <button
            onClick={fetchRestaurants}
            className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick stats — pulled from /admin/restaurants/stats, not the current page's array */}
      {stats.total > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm shadow-black/2">
            <Store className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{stats.total}</span> total
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm shadow-black/2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{stats.open}</span> open
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm shadow-black/2">
            <span className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{stats.closed}</span> closed
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm shadow-black/2">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{stats.verified}</span> verified
            </span>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by restaurant or owner name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
        />
      </div>

      {filteredRestaurants.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2">
          <Store className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">
            {searchTerm ? 'No restaurants match your search' : 'No restaurants yet'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-5 hover:shadow-md hover:shadow-black/4 transition-shadow cursor-pointer"
              onClick={() => openDetail(restaurant.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-semibold text-gray-900 truncate">{restaurant.name}</h3>
                    {restaurant.isVerified && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                  </div>
                  <div className="flex items-start gap-1.5 text-sm text-gray-500 mt-1.5">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gray-300" />
                    <span className="truncate">{restaurant.address}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-sm text-gray-600">{restaurant.rating || 'New'}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">Owner: {restaurant.ownerName || 'Unknown'}</p>
                </div>
                <span
                  className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                    restaurant.isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {restaurant.isOpen ? 'Open' : 'Closed'}
                </span>
              </div>

              {/* ✅ New — inline quick actions, previously the whole card was just a display */}
              <div className="mt-4 pt-3 border-t border-gray-100 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button
                  disabled={actionLoading}
                  onClick={() => handleToggleOpen(restaurant)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  {restaurant.isOpen ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {restaurant.isOpen ? 'Close' : 'Open'}
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => handleToggleVerify(restaurant)}
                  className="flex-1 flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {restaurant.isVerified ? 'Unverify' : 'Verify'}
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => handleDelete(restaurant)}
                  className="flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} loading={loading} />

      {/* Restaurant Detail Modal */}
      {(selectedRestaurant || detailLoading) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white p-5 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Restaurant Details</h3>
              <button onClick={() => setSelectedRestaurant(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {detailLoading || !selectedRestaurant ? (
              <div className="p-10 flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
              </div>
            ) : (
              <>
                <div className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-lg text-gray-900">{selectedRestaurant.name}</h4>
                        {selectedRestaurant.isVerified && <ShieldCheck className="w-4 h-4 text-blue-500" />}
                      </div>
                      <p className="text-sm text-gray-500">{selectedRestaurant.cuisineType}</p>
                    </div>
                    <span
                      className={`shrink-0 text-xs px-2.5 py-1 rounded-full font-medium ${
                        selectedRestaurant.isOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {selectedRestaurant.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400">Address</p>
                    <p className="text-sm text-gray-800">{selectedRestaurant.address}</p>
                  </div>

                  {selectedRestaurant.description && (
                    <div>
                      <p className="text-xs text-gray-400">Description</p>
                      <p className="text-sm text-gray-700">{selectedRestaurant.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-xs text-gray-400">Total Orders</p>
                      <p className="font-semibold text-sm text-gray-800">{selectedRestaurant.totalOrders}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-xs text-gray-400">Total Revenue</p>
                      <p className="font-semibold text-sm text-orange-600">৳{(selectedRestaurant.totalRevenue || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-xs text-gray-400">Avg Order Value</p>
                      <p className="font-semibold text-sm text-gray-800">৳{Math.round(selectedRestaurant.averageOrderValue || 0)}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3.5">
                      <p className="text-xs text-gray-400">Rating</p>
                      <p className="font-semibold text-sm text-gray-800 flex items-center gap-1">
                        {selectedRestaurant.rating || 'New'} <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 mb-1">Owner</p>
                    <p className="text-sm font-medium text-gray-800">{selectedRestaurant.ownerName}</p>
                    {selectedRestaurant.ownerEmail && (
                      <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5 text-gray-300" /> {selectedRestaurant.ownerEmail}
                      </p>
                    )}
                    {selectedRestaurant.ownerPhone && (
                      <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3.5 h-3.5 text-gray-300" /> {selectedRestaurant.ownerPhone}
                      </p>
                    )}
                  </div>

                  {selectedRestaurant.recentOrders?.length > 0 && (
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Recent Orders</p>
                      <div className="space-y-1.5">
                        {selectedRestaurant.recentOrders.slice(0, 5).map((order) => (
                          <div key={order.id} className="flex justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                            <span className="text-gray-600">{order.customer?.fullName || 'Guest'}</span>
                            <span className="font-medium text-gray-800">৳{order.totalAmount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-2">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleToggleOpen(selectedRestaurant)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    {selectedRestaurant.isOpen ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    {selectedRestaurant.isOpen ? 'Close' : 'Open'}
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleToggleVerify(selectedRestaurant)}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {selectedRestaurant.isVerified ? 'Unverify' : 'Verify'}
                  </button>
                  <button
                    disabled={actionLoading}
                    onClick={() => handleDelete(selectedRestaurant)}
                    className="flex items-center justify-center px-4 py-2.5 rounded-xl text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}