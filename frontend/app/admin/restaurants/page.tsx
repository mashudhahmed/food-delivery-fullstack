'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Star, Search, RefreshCw, Store, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

interface Restaurant {
  id: string;
  name: string;
  address: string;
  rating?: number;
  ownerName?: string;
  isOpen: boolean;
}

// ✅ Ensure array in case the API wraps the list in an object
const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.restaurants && Array.isArray(data.restaurants)) return data.restaurants;
  console.warn('⚠️ Unexpected data format for restaurants:', typeof data, data);
  return [];
};

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/restaurants');
      setRestaurants(ensureArray(response.data));
    } catch (error) {
      toast.error('Failed to load restaurants');
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRestaurants = restaurants.filter(
    (r) => r.name?.toLowerCase().includes(searchTerm.toLowerCase()) || r.ownerName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCount = restaurants.filter((r) => r.isOpen).length;

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
        <button
          onClick={fetchRestaurants}
          className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition shrink-0"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Quick stats */}
      {restaurants.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm shadow-black/2">
            <Store className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{restaurants.length}</span> total
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm shadow-black/2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{openCount}</span> open
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm shadow-black/2">
            <span className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{restaurants.length - openCount}</span> closed
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
              className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/2 p-5 hover:shadow-md hover:shadow-black/4 transition-shadow"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900 truncate">{restaurant.name}</h3>
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}