'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth } from '@/lib/api';
import { api } from '@/lib/api';
import {
  Menu as MenuIcon,
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  AlertCircle,
  Store,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
  category: string;
  imageUrl?: string;
}

interface Restaurant {
  id: string;
  name: string;
}

// Create a separate component that uses useSearchParams
function OwnerMenuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const restaurantIdParam = searchParams.get('restaurant');

  const [user, setUser] = useState<any>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form data - restaurantId only for selection, NOT sent to API
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    restaurantId: '', // Used for selection only, not sent in API body
  });

  const categories = ['All', 'Appetizers', 'Main Course', 'Beverages', 'Desserts', 'Sides'];

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser || currentUser.role !== 'owner') {
      router.push('/');
      return;
    }
    setUser(currentUser);
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (restaurantIdParam && restaurants.length > 0) {
      setSelectedRestaurant(restaurantIdParam);
    }
  }, [restaurantIdParam, restaurants]);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchMenuItems();
    }
  }, [selectedRestaurant]);

  const fetchRestaurants = async () => {
    try {
      const currentUser = auth.getCurrentUser();
      const response = await api.get(`/restaurants?ownerId=${currentUser?.id}`);
      const ownerRestaurants = response.data || [];
      setRestaurants(ownerRestaurants);

      // Auto-select first restaurant if available
      if (ownerRestaurants.length > 0 && !selectedRestaurant) {
        setSelectedRestaurant(ownerRestaurants[0].id);
      }
    } catch (error) {
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItems = async () => {
    if (!selectedRestaurant) return;
    try {
      const response = await api.get(`/menu/restaurant/${selectedRestaurant}`);
      setMenuItems(response.data || []);
    } catch (error) {
      console.error('Failed to load menu:', error);
      setMenuItems([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let targetRestaurantId = selectedRestaurant;

    if (!editingItem) {
      targetRestaurantId = formData.restaurantId || selectedRestaurant;
      if (!targetRestaurantId) {
        toast.error('Please select a restaurant first');
        return;
      }
    }

    if (!editingItem) {
      if (!formData.name.trim()) {
        toast.error('Please enter item name');
        return;
      }
      if (!formData.description.trim()) {
        toast.error('Please enter item description');
        return;
      }
      if (!formData.price || parseFloat(formData.price) <= 0) {
        toast.error('Please enter a valid price');
        return;
      }
      if (!formData.category) {
        toast.error('Please select a category');
        return;
      }
    } else {
      if (formData.name && !formData.name.trim()) {
        toast.error('Item name cannot be empty');
        return;
      }
      if (formData.price && parseFloat(formData.price) <= 0) {
        toast.error('Please enter a valid price');
        return;
      }
    }

    try {
      if (editingItem) {
        const updateData: any = {};
        if (formData.name && formData.name !== editingItem.name) updateData.name = formData.name.trim();
        if (formData.description && formData.description !== editingItem.description)
          updateData.description = formData.description.trim();
        if (formData.price && parseFloat(formData.price) !== editingItem.price)
          updateData.price = parseFloat(formData.price);
        if (formData.category && formData.category !== editingItem.category) updateData.category = formData.category;

        if (Object.keys(updateData).length === 0) {
          toast.error('No changes made');
          return;
        }

        await api.patch(`/menu/${editingItem.id}`, updateData);
        toast.success('Menu item updated');
      } else {
        const data = {
          name: formData.name.trim(),
          description: formData.description.trim(),
          price: parseFloat(formData.price),
          category: formData.category,
          isAvailable: true,
        };
        await api.post(`/menu/restaurant/${targetRestaurantId}`, data);
        toast.success('Menu item added');
      }

      setShowModal(false);
      setEditingItem(null);
      setFormData({ name: '', description: '', price: '', category: '', restaurantId: '' });
      fetchMenuItems();
    } catch (error: any) {
      console.error('Error:', error.response?.data);
      const errorData = error.response?.data;
      if (errorData?.message) {
        if (Array.isArray(errorData.message)) {
          toast.error(errorData.message.join(', '));
        } else {
          toast.error(errorData.message);
        }
      } else if (errorData?.error) {
        toast.error(errorData.error);
      } else {
        toast.error('Operation failed. Please check all fields.');
      }
    }
  };

  const toggleAvailability = async (id: string, currentStatus: boolean) => {
    try {
      await api.patch(`/menu/${id}`, { isAvailable: !currentStatus });
      toast.success(`Item ${!currentStatus ? 'available' : 'unavailable'}`);
      fetchMenuItems();
    } catch (error: any) {
      console.error('Toggle error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const openDeleteModal = (item: MenuItem) => {
    setItemToDelete(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    setDeleting(true);
    try {
      await api.delete(`/menu/${itemToDelete.id}`);
      toast.success('Menu item deleted');
      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchMenuItems();
    } catch (error: any) {
      console.error('Delete error:', error.response?.data);
      toast.error(error.response?.data?.message || 'Failed to delete item');
    } finally {
      setDeleting(false);
    }
  };

  const openAddModal = () => {
    if (restaurants.length === 0) {
      toast.error('Please add a restaurant first before adding menu items');
      return;
    }
    setEditingItem(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      restaurantId: restaurants.length === 1 ? restaurants[0].id : '',
    });
    setShowModal(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      restaurantId: '',
    });
    setShowModal(true);
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const availableCount = menuItems.filter((i) => i.isAvailable).length;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-56 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-72 bg-gray-100 rounded-2xl border border-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setItemToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Menu Item"
        message="Are you sure you want to delete this menu item?"
        itemName={itemToDelete?.name}
        loading={deleting}
      />

      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your restaurant menu items</p>
        </div>
        <button
          onClick={openAddModal}
          disabled={restaurants.length === 0}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition ${
            restaurants.length === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-orange-500 text-white hover:bg-orange-600 shadow-sm shadow-orange-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          Add Menu Item
        </button>
      </div>

      {restaurants.length === 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">No restaurants found</p>
            <p className="text-sm text-amber-700">Please add a restaurant before adding menu items.</p>
          </div>
          <button
            onClick={() => router.push('/owner/restaurants')}
            className="px-4 py-2 bg-amber-500 text-white text-sm font-medium rounded-xl hover:bg-amber-600 transition shrink-0"
          >
            Add Restaurant
          </button>
        </div>
      )}

      {/* Quick stats */}
      {selectedRestaurant && menuItems.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm shadow-black/[0.02]">
            <MenuIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{menuItems.length}</span> items
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm shadow-black/[0.02]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{availableCount}</span> available
            </span>
          </div>
          <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-4 py-2.5 shadow-sm shadow-black/[0.02]">
            <span className="w-2 h-2 rounded-full bg-gray-300" />
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{menuItems.length - availableCount}</span> unavailable
            </span>
          </div>
        </div>
      )}

      {restaurants.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 mb-4 -mx-1 px-1">
          {restaurants.map((restaurant) => (
            <button
              key={restaurant.id}
              onClick={() => setSelectedRestaurant(restaurant.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap border ${
                selectedRestaurant === restaurant.id
                  ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              {restaurant.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category === 'All' ? 'all' : category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                selectedCategory === (category === 'All' ? 'all' : category)
                  ? 'bg-orange-500 text-white'
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {selectedRestaurant && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/[0.02] overflow-hidden hover:shadow-md hover:shadow-black/[0.04] transition-shadow"
            >
              <div className="relative h-40 bg-gray-100">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-gray-50 to-gray-100">
                    🍽️
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => toggleAvailability(item.id, item.isAvailable)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm transition ${
                      item.isAvailable
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${item.isAvailable ? 'bg-white' : 'bg-gray-400'}`} />
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                    <span className="inline-block text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full mt-2">
                      {item.category}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-orange-600 tabular-nums shrink-0">৳{item.price}</p>
                </div>
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => openEditModal(item)}
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition flex items-center justify-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteModal(item)}
                    className="flex-1 px-3 py-1.5 border border-red-100 text-red-600 rounded-lg text-sm hover:bg-red-50 transition flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedRestaurant && filteredItems.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm shadow-black/[0.02]">
          <MenuIcon className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-600">No menu items found</p>
          <p className="text-xs text-gray-400 mt-1 mb-4">Add a dish to start filling out this restaurant's menu.</p>
          <button onClick={openAddModal} className="text-sm font-medium text-orange-600 hover:text-orange-700">
            Add your first menu item →
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
              <h2 className="text-lg font-bold text-gray-900">{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {!editingItem && restaurants.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Restaurant</label>
                  <select
                    required
                    value={formData.restaurantId}
                    onChange={(e) => setFormData({ ...formData, restaurantId: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition cursor-pointer"
                  >
                    <option value="">Select Restaurant</option>
                    {restaurants.map((restaurant) => (
                      <option key={restaurant.id} value={restaurant.id}>
                        {restaurant.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1.5">Select which restaurant this menu item belongs to</p>
                </div>
              )}

              {editingItem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Restaurant</label>
                  <input
                    type="text"
                    value={restaurants.find((r) => r.id === selectedRestaurant)?.name || 'Selected Restaurant'}
                    disabled
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1.5">Menu items cannot be moved between restaurants</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required={!editingItem}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required={!editingItem}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the dish (ingredients, serving size, etc.)"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Price (৳) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  required={!editingItem}
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  required={!editingItem}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition cursor-pointer"
                >
                  <option value="">Select Category</option>
                  <option value="Appetizers">Appetizers</option>
                  <option value="Main Course">Main Course</option>
                  <option value="Beverages">Beverages</option>
                  <option value="Desserts">Desserts</option>
                  <option value="Sides">Sides</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-orange-600 transition shadow-sm shadow-orange-200"
                >
                  {editingItem ? 'Update' : 'Add'} Item
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

// Main export with Suspense boundary
export default function OwnerMenuPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      }
    >
      <OwnerMenuContent />
    </Suspense>
  );
}