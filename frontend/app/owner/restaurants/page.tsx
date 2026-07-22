// app/owner/restaurants/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import {
  Store,
  Plus,
  Edit,
  Trash2,
  Search,
  MapPin,
  Phone,
  Star,
  X,
  CheckCircle2,
  PauseCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

interface Restaurant {
  id: string;
  name: string;
  description: string;
  address: string;
  phone: string;
  cuisineType: string;
  isOpen: boolean;
  rating: number;
  imageUrl?: string;
}

// ✅ Helper to ensure array
const ensureArray = (data: any): any[] => {
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.restaurants && Array.isArray(data.restaurants)) return data.restaurants;
  console.warn('⚠️ Unexpected data format for restaurants:', typeof data, data);
  return [];
};

const CUISINES = [
  'Italian', 'Chinese', 'Mexican', 'Indian', 'Japanese', 'Thai', 'American',
  'Mediterranean', 'Vietnamese', 'Korean', 'French', 'Spanish', 'Greek', 'Turkish', 'Brazilian',
];

export default function OwnerRestaurantsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<Restaurant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    cuisineType: '',
  });

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [restaurantToDelete, setRestaurantToDelete] = useState<Restaurant | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser || currentUser.role !== 'owner') {
      router.push('/');
      return;
    }
    setUser(currentUser);
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const currentUser = auth.getCurrentUser();
      const response = await api.get(`/restaurants?ownerId=${currentUser?.id}`);

      // ✅ Ensure we have an array
      const data = response.data;
      const restaurantsArray = ensureArray(data);

      console.log('🔵 Fetched restaurants:', restaurantsArray.length);
      setRestaurants(restaurantsArray);
    } catch (error) {
      console.error('Failed to load restaurants:', error);
      toast.error('Failed to load restaurants');
      setRestaurants([]); // ✅ Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRestaurant) {
        await api.patch(`/restaurants/${editingRestaurant.id}`, formData);
        toast.success('Restaurant updated successfully');
      } else {
        await api.post('/restaurants', formData);
        toast.success('Restaurant created successfully');
      }
      setShowModal(false);
      setEditingRestaurant(null);
      setFormData({ name: '', description: '', address: '', phone: '', cuisineType: '' });
      fetchRestaurants();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
    }
  };

  const toggleRestaurantStatus = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/restaurants/${id}`, { isOpen: !currentStatus });
      toast.success(`Restaurant ${!currentStatus ? 'opened' : 'closed'}`);
      fetchRestaurants();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const openDeleteModal = (restaurant: Restaurant) => {
    setRestaurantToDelete(restaurant);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!restaurantToDelete) return;

    setDeleting(true);
    try {
      await api.delete(`/restaurants/${restaurantToDelete.id}`);
      toast.success('Restaurant deleted successfully');
      setShowDeleteModal(false);
      setRestaurantToDelete(null);
      fetchRestaurants();
    } catch (error: any) {
      const status = error.response?.status;
      const message = error.response?.data?.message || 'Failed to delete restaurant';

      if (status === 403) {
        toast.error('You do not have permission to delete this restaurant');
      } else if (message.toLowerCase().includes('order')) {
        toast.error('Cannot delete restaurant with existing orders. Please archive instead.');
      } else if (message.toLowerCase().includes('menu')) {
        toast.error('Please delete all menu items before deleting the restaurant.');
      } else {
        toast.error(message);
      }
    } finally {
      setDeleting(false);
    }
  };

  // ✅ Safe filter - ensure restaurants is an array
  const safeRestaurants = Array.isArray(restaurants) ? restaurants : [];

  const filteredRestaurants = safeRestaurants.filter(
    (r) =>
      r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.cuisineType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openCount = safeRestaurants.filter((r) => r.isOpen).length;
  const closedCount = safeRestaurants.length - openCount;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-100 rounded-2xl border border-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setRestaurantToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Restaurant"
        message="Are you sure you want to delete this restaurant?"
        itemName={restaurantToDelete?.name}
        loading={deleting}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Restaurants</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your restaurant listings</p>
        </div>
        <button
          onClick={() => {
            setEditingRestaurant(null);
            setFormData({ name: '', description: '', address: '', phone: '', cuisineType: '' });
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-xl hover:bg-orange-600 transition shadow-sm shadow-orange-200"
        >
          <Plus className="w-4 h-4" />
          Add Restaurant
        </button>
      </div>

      {/* Quick stats */}
      {safeRestaurants.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm shadow-black/[0.02]">
            <Store className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{safeRestaurants.length}</span> total
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm shadow-black/[0.02]">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{openCount}</span> open
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm shadow-black/[0.02]">
            <PauseCircle className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{closedCount}</span> closed
            </span>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or cuisine..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
        />
      </div>

      {/* Restaurants Grid */}
      {filteredRestaurants.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/[0.02]">
          <Store className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">
            {searchTerm ? 'No restaurants found matching your search' : 'No restaurants yet'}
          </p>
          {!searchTerm && (
            <>
              <p className="text-xs text-gray-400 mt-1 mb-4">Add your first location to start taking orders.</p>
              <button
                onClick={() => setShowModal(true)}
                className="text-sm font-medium text-orange-600 hover:text-orange-700"
              >
                Add your first restaurant →
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/[0.02] overflow-hidden hover:shadow-md hover:shadow-black/[0.04] transition-shadow"
            >
              <div className="relative h-44 bg-gray-100">
                {restaurant.imageUrl ? (
                  <Image src={restaurant.imageUrl} alt={restaurant.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl bg-gradient-to-br from-gray-50 to-gray-100">
                    🍔
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => toggleRestaurantStatus(restaurant.id, restaurant.isOpen)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium shadow-sm transition ${
                      restaurant.isOpen
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${restaurant.isOpen ? 'bg-white' : 'bg-gray-400'}`} />
                    {restaurant.isOpen ? 'Open' : 'Closed'}
                  </button>
                </div>
              </div>

              <div className="p-5">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-gray-900 truncate">{restaurant.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-sm text-gray-600">{restaurant.rating || 'New'}</span>
                      {restaurant.cuisineType && (
                        <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full ml-1">
                          {restaurant.cuisineType}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => {
                        setEditingRestaurant(restaurant);
                        setFormData({
                          name: restaurant.name,
                          description: restaurant.description || '',
                          address: restaurant.address,
                          phone: restaurant.phone,
                          cuisineType: restaurant.cuisineType,
                        });
                        setShowModal(true);
                      }}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                      aria-label="Edit restaurant"
                    >
                      <Edit className="w-4 h-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => openDeleteModal(restaurant)}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-100 transition"
                      aria-label="Delete restaurant"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-start gap-2 text-sm text-gray-500">
                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-300" />
                    <span className="truncate">{restaurant.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Phone className="w-4 h-4 shrink-0 text-gray-300" />
                    <span>{restaurant.phone}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => router.push(`/owner/menu?restaurant=${restaurant.id}`)}
                    className="flex-1 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-sm font-medium hover:bg-orange-100 transition"
                  >
                    Manage Menu
                  </button>
                  <button
                    onClick={() => router.push(`/owner/orders?restaurant=${restaurant.id}`)}
                    className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition"
                  >
                    View Orders
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">
                {editingRestaurant ? 'Edit Restaurant' : 'Add New Restaurant'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Restaurant Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Cuisine Type</label>
                <select
                  required
                  value={formData.cuisineType}
                  onChange={(e) => setFormData({ ...formData, cuisineType: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition cursor-pointer"
                >
                  <option value="">Select Cuisine</option>
                  {CUISINES.map((cuisine) => (
                    <option key={cuisine} value={cuisine}>
                      {cuisine}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-orange-600 transition shadow-sm shadow-orange-200"
                >
                  {editingRestaurant ? 'Update' : 'Create'} Restaurant
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}