'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
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
  X
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
    try {
      const currentUser = auth.getCurrentUser();
      const response = await api.get(`/restaurants?ownerId=${currentUser?.id}`);
      setRestaurants(response.data || []);
    } catch (error) {
      toast.error('Failed to load restaurants');
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

  // Updated delete function with modal
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

  const filteredRestaurants = restaurants.filter(r =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.cuisineType.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">My Restaurants</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your restaurant listings</p>
        </div>
        <button
          onClick={() => {
            setEditingRestaurant(null);
            setFormData({ name: '', description: '', address: '', phone: '', cuisineType: '' });
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
        >
          <Plus className="w-4 h-4" />
          Add Restaurant
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or cuisine..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* Restaurants Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRestaurants.map((restaurant) => (
          <div key={restaurant.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
            <div className="relative h-48 bg-gray-100">
              {restaurant.imageUrl ? (
                <Image src={restaurant.imageUrl} alt={restaurant.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">🍔</div>
              )}
              <div className="absolute top-3 right-3 flex gap-2">
                <button
                  onClick={() => toggleRestaurantStatus(restaurant.id, restaurant.isOpen)}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    restaurant.isOpen ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  }`}
                >
                  {restaurant.isOpen ? 'Open' : 'Closed'}
                </button>
              </div>
            </div>
            
            <div className="p-5">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{restaurant.name}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm text-gray-600">{restaurant.rating || 'New'}</span>
                    <span className="text-xs text-gray-400 ml-2">{restaurant.cuisineType}</span>
                  </div>
                </div>
                <div className="flex gap-2">
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
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(restaurant)}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-start gap-2 text-sm text-gray-500">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{restaurant.address}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Phone className="w-4 h-4" />
                  <span>{restaurant.phone}</span>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => router.push(`/owner/menu?restaurant=${restaurant.id}`)}
                  className="flex-1 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg text-sm font-medium hover:bg-orange-100 transition"
                >
                  Manage Menu
                </button>
                <button
                  onClick={() => router.push(`/owner/orders?restaurant=${restaurant.id}`)}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                >
                  View Orders
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredRestaurants.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No restaurants found</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 text-orange-500 hover:text-orange-600"
          >
            Add your first restaurant
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">
                {editingRestaurant ? 'Edit Restaurant' : 'Add New Restaurant'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Restaurant Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cuisine Type</label>
                <select
                  required
                  value={formData.cuisineType}
                  onChange={(e) => setFormData({ ...formData, cuisineType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
                >
                  <option value="">Select Cuisine</option>
                  <option value="Italian">Italian</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Mexican">Mexican</option>
                  <option value="Indian">Indian</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Thai">Thai</option>
                  <option value="American">American</option>
                  <option value="Mediterranean">Mediterranean</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition">
                  {editingRestaurant ? 'Update' : 'Create'} Restaurant
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-lg hover:bg-gray-50 transition">
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