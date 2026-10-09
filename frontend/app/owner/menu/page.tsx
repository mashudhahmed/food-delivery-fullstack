'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { unwrapPaginated, ensureArray } from '@/lib/unwrapPaginated';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import toast from 'react-hot-toast';
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  ImageIcon,
  Loader2,
  X,
  Search,
  CheckCircle2,
  AlertCircle,
  Tag,
  Store,
} from 'lucide-react';
import Image from 'next/image';
import { isAxiosError } from 'axios';

// Helper to safely get error messages
function getErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined;
    if (data?.message) return data.message;
  }
  return fallback;
}

const COMMON_CATEGORIES = [
  'Burgers',
  'Pizza',
  'Biryani',
  'Platters & Rice',
  'Appetizers & Sides',
  'Beverages',
  'Desserts',
  'Snacks',
];

interface Restaurant {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl?: string;
  isAvailable: boolean;
}

export default function OwnerMenuPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [formRestaurantId, setFormRestaurantId] = useState('');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageUrl: '',
    isAvailable: true,
  });

  // Fetch restaurants
  const fetchRestaurants = useCallback(async () => {
    try {
      setLoading(true);
      const currentUser = auth.getCurrentUser();
      if (!currentUser?.id) return;

      const res = await api.get(`/restaurants?ownerId=${currentUser.id}`);
      const list = ensureArray(res.data?.data ?? res.data) as Restaurant[];
      setRestaurants(list);
      if (list.length > 0) {
        setSelectedRestaurantId(list[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, 'Failed to load restaurants'));
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch menu for selected restaurant
  const fetchMenu = useCallback(async (restaurantId: string) => {
    try {
      const res = await api.get(`/menu/restaurant/${restaurantId}`);
      const list = ensureArray(
        unwrapPaginated(res.data).items.length
          ? unwrapPaginated(res.data).items
          : res.data?.data ?? res.data,
      ) as MenuItem[];
      setMenuItems(list);
    } catch (err) {
      console.error(err);
      toast.error(getErrorMessage(err, 'Failed to load menu'));
      setMenuItems([]);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => fetchRestaurants());
  }, [fetchRestaurants]);

  useEffect(() => {
    if (selectedRestaurantId) {
      void Promise.resolve().then(() => fetchMenu(selectedRestaurantId));
    }
  }, [selectedRestaurantId, fetchMenu]);

  // Extract all unique categories present in existing menu
  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    menuItems.forEach((m) => {
      if (m.category?.trim()) cats.add(m.category.trim());
    });
    return Array.from(cats);
  }, [menuItems]);

  // Combined suggestions for modal chips
  const categorySuggestions = useMemo(() => {
    const merged = new Set([...uniqueCategories, ...COMMON_CATEGORIES]);
    return Array.from(merged).slice(0, 8);
  }, [uniqueCategories]);

  // Filtered menu items for the table
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCat =
        categoryFilter === 'ALL' ||
        item.category?.toLowerCase() === categoryFilter.toLowerCase();

      return matchesSearch && matchesCat;
    });
  }, [menuItems, searchQuery, categoryFilter]);

  function openCreate() {
    setEditingItem(null);
    setFormRestaurantId(selectedRestaurantId || restaurants[0]?.id || '');
    setForm({
      name: '',
      description: '',
      price: '',
      category: '',
      imageUrl: '',
      isAvailable: true,
    });
    setShowForm(true);
  }

  function openEdit(item: MenuItem) {
    setEditingItem(item);
    setFormRestaurantId(selectedRestaurantId);
    setForm({
      name: item.name || '',
      description: item.description || '',
      price: String(item.price ?? ''),
      category: item.category || '',
      imageUrl: item.imageUrl || '',
      isAvailable: item.isAvailable !== false,
    });
    setShowForm(true);
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file (PNG, JPG, WebP)');
      return;
    }

    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/uploads/menu-item', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res.data?.data || res.data;
      const url = data.secureUrl || data.url;

      if (url) {
        setForm((prev) => ({ ...prev, imageUrl: url }));
        toast.success('Food photo uploaded successfully');
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to upload photo'));
    } finally {
      setUploadingImage(false);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const targetRestaurantId = formRestaurantId || selectedRestaurantId;
    if (!targetRestaurantId) {
      toast.error('Please select a restaurant first');
      return;
    }

    const trimmedName = form.name.trim();
    const parsedPrice = Number(form.price);

    if (!trimmedName) {
      toast.error('Item name is required');
      return;
    }

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      toast.error('Please enter a valid price');
      return;
    }

    const payload: Record<string, any> = {
      name: trimmedName,
      description: form.description.trim(),
      price: parsedPrice,
      category: form.category.trim() || 'General',
      isAvailable: form.isAvailable,
    };

    if (form.imageUrl) {
      payload.imageUrl = form.imageUrl;
    }

    try {
      setSaving(true);
      if (editingItem) {
        await api.patch(`/menu/${editingItem.id}`, payload);
        toast.success('Menu item updated successfully');
      } else {
        await api.post(`/menu/restaurant/${targetRestaurantId}`, payload);
        toast.success('Menu item created successfully');
        if (targetRestaurantId !== selectedRestaurantId) {
          setSelectedRestaurantId(targetRestaurantId);
        }
      }
      setShowForm(false);
      fetchMenu(targetRestaurantId);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save menu item'));
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(item: MenuItem) {
    try {
      setTogglingId(item.id);
      const newStatus = item.isAvailable === false ? true : false;
      await api.patch(`/menu/${item.id}`, { isAvailable: newStatus });
      setMenuItems((prev) =>
        prev.map((m) => (m.id === item.id ? { ...m, isAvailable: newStatus } : m)),
      );
      toast.success(
        newStatus
          ? `"${item.name}" is now Available`
          : `"${item.name}" marked Sold Out`,
      );
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update item availability'));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await api.delete(`/menu/${deleteId}`);
      toast.success('Item deleted successfully');
      setDeleteId(null);
      fetchMenu(selectedRestaurantId);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to delete'));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage your dishes, pricing, stock availability, and categories
          </p>
        </div>

        <div className="flex items-center gap-3">
          {restaurants.length > 1 ? (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-orange-500">
                <Store className="w-4 h-4" />
              </div>
              <select
                value={selectedRestaurantId}
                onChange={(e) => setSelectedRestaurantId(e.target.value)}
                className="border border-gray-300 rounded-lg pl-9 pr-8 py-2 text-sm bg-white font-medium text-gray-800 focus:ring-2 focus:ring-orange-500 focus:outline-none"
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          ) : restaurants.length === 1 ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-900 font-semibold shadow-xs">
              <Store className="w-4 h-4 text-orange-600 shrink-0" />
              <span>{restaurants[0].name}</span>
            </div>
          ) : null}

          <button
            onClick={openCreate}
            disabled={!selectedRestaurantId && restaurants.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-semibold shadow-sm hover:bg-orange-600 disabled:opacity-50 transition"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {restaurants.length === 0 ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-500 shadow-sm">
          <p className="font-medium text-gray-700">No restaurants found</p>
          <p className="text-sm text-gray-500 mt-1">
            You must have an active restaurant to manage menu items.
          </p>
        </div>
      ) : (
        <>
          {/* Search & Filter Toolbar */}
          <div className="bg-white rounded-xl border p-4 mb-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search items by name, category, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
              <button
                onClick={() => setCategoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                  categoryFilter === 'ALL'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All ({menuItems.length})
              </button>
              {uniqueCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                    categoryFilter.toLowerCase() === cat.toLowerCase()
                      ? 'bg-orange-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat} (
                  {
                    menuItems.filter(
                      (m) => m.category?.toLowerCase() === cat.toLowerCase(),
                    ).length
                  }
                  )
                </button>
              ))}
            </div>
          </div>

          {/* Menu Items Table / Empty State */}
          {filteredMenuItems.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-500 shadow-sm">
              <p className="font-semibold text-gray-800">
                {menuItems.length === 0
                  ? 'No menu items yet'
                  : 'No matching items found'}
              </p>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                {menuItems.length === 0
                  ? 'Click "Add Item" above to add your first dish to the menu.'
                  : 'Try clearing your search query or category filter.'}
              </p>
              {menuItems.length === 0 ? (
                <button
                  onClick={openCreate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
                >
                  <Plus className="w-4 h-4" /> Add First Dish
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('ALL');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-orange-600 hover:underline font-medium"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b">
                    <tr>
                      <th className="p-4 w-16">Photo</th>
                      <th className="p-4">Item Details</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Stock Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredMenuItems.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50/60 transition group"
                      >
                        {/* Food Photo */}
                        <td className="p-4">
                          {item.imageUrl ? (
                            <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 shadow-sm">
                              <Image
                                src={item.imageUrl}
                                alt={item.name}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="w-14 h-14 rounded-lg bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
                              <ImageIcon className="w-6 h-6 stroke-[1.5]" />
                            </div>
                          )}
                        </td>

                        {/* Name & Description */}
                        <td className="p-4 max-w-xs">
                          <p className="font-semibold text-gray-900">
                            {item.name}
                          </p>
                          {item.description ? (
                            <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                              {item.description}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 italic mt-0.5">
                              No description added
                            </p>
                          )}
                        </td>

                        {/* Category */}
                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-medium">
                            <Tag className="w-3 h-3 text-gray-400" />
                            {item.category || 'General'}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="p-4 font-bold text-gray-900 whitespace-nowrap">
                          ৳{Number(item.price).toLocaleString()}
                        </td>

                        {/* Fast Stock Availability Toggle */}
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => toggleAvailability(item)}
                            disabled={togglingId === item.id}
                            title="Click to toggle stock availability"
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition cursor-pointer border ${
                              item.isAvailable !== false
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                          >
                            {togglingId === item.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : item.isAvailable !== false ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                            )}
                            <span>
                              {item.isAvailable !== false
                                ? 'In Stock'
                                : 'Sold Out'}
                            </span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right whitespace-nowrap space-x-1">
                          <button
                            onClick={() => openEdit(item)}
                            title="Edit Item"
                            className="p-2 hover:bg-orange-50 hover:text-orange-600 rounded-lg text-gray-600 transition"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(item.id)}
                            title="Delete Item"
                            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-lg text-gray-400 hover:text-red-600 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ============================================================== */}
      {/* ADD / EDIT MENU ITEM MODAL FORM                                */}
      {/* ============================================================== */}
      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !saving && !uploadingImage) {
              setShowForm(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editingItem
                    ? 'Update recipe info, price, and visibility on the customer app'
                    : 'Add a new dish with pricing, photo, and details'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={saving || uploadingImage}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Scrollable Body */}
            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
              {/* Restaurant Outlet Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Restaurant Outlet <span className="text-red-500">*</span>
                </label>

                {restaurants.length > 1 && !editingItem ? (
                  <div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-orange-500">
                        <Store className="w-4 h-4" />
                      </div>
                      <select
                        value={formRestaurantId}
                        onChange={(e) => setFormRestaurantId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg pl-10 pr-3.5 py-2.5 text-sm bg-white font-medium text-gray-800 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition"
                      >
                        {restaurants.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Choose which restaurant branch this dish will be published under.
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <Store className="w-4 h-4 text-orange-500 shrink-0" />
                      <span className="text-sm font-semibold text-gray-900">
                        {restaurants.find(
                          (r) =>
                            r.id ===
                            (editingItem ? selectedRestaurantId : formRestaurantId),
                        )?.name ||
                          restaurants[0]?.name ||
                          'Your Restaurant'}
                      </span>
                    </div>
                    <span className="text-xs bg-gray-200 text-gray-700 font-medium px-2 py-0.5 rounded">
                      {editingItem ? 'Assigned Outlet' : 'Active Outlet'}
                    </span>
                  </div>
                )}
              </div>

              {/* Field 1: Food Photograph */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Food Photograph
                  <span className="text-xs font-normal text-gray-500 ml-1.5">
                    (PNG, JPG, or WebP up to 5MB)
                  </span>
                </label>

                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  {form.imageUrl ? (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-300 shrink-0 bg-white shadow-xs">
                      <Image
                        src={form.imageUrl}
                        alt="Dish preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-lg bg-white border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 shrink-0">
                      <ImageIcon className="w-7 h-7 text-gray-300 mb-0.5" />
                      <span className="text-[10px] text-gray-400">No Photo</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition shadow-xs">
                        {uploadingImage ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-500" />
                        ) : (
                          <Upload className="w-3.5 h-3.5 text-gray-600" />
                        )}
                        <span>
                          {uploadingImage
                            ? 'Uploading...'
                            : form.imageUrl
                            ? 'Change Photo'
                            : 'Upload Photo'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          disabled={uploadingImage || saving}
                          className="hidden"
                        />
                      </label>

                      {form.imageUrl && (
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
                          disabled={uploadingImage || saving}
                          className="px-2.5 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg font-medium transition"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500">
                      Items with high-quality photos get up to 2.5x more orders.
                    </p>
                  </div>
                </div>
              </div>

              {/* Field 2: Item / Dish Name */}
              <div>
                <label
                  htmlFor="menu-item-name"
                  className="block text-sm font-semibold text-gray-800 mb-1"
                >
                  Dish Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="menu-item-name"
                  required
                  type="text"
                  placeholder="e.g. Smoky BBQ Beef Cheese Burger"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition"
                />
              </div>

              {/* Field 3 & 4: Price & Category in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Price (BDT ৳) */}
                <div>
                  <label
                    htmlFor="menu-item-price"
                    className="block text-sm font-semibold text-gray-800 mb-1"
                  >
                    Price (BDT) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-600 font-bold text-sm">
                      ৳
                    </span>
                    <input
                      id="menu-item-price"
                      required
                      type="number"
                      min="0"
                      step="1"
                      placeholder="280"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg pl-8 pr-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition"
                    />
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label
                    htmlFor="menu-item-category"
                    className="block text-sm font-semibold text-gray-800 mb-1"
                  >
                    Category <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="menu-item-category"
                    required
                    type="text"
                    placeholder="e.g. Burgers, Biryani"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Category Quick Suggestion Chips */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5 font-medium">
                  Quick Category Suggestions:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {categorySuggestions.map((cat) => {
                    const isSelected =
                      form.category.trim().toLowerCase() === cat.toLowerCase();
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, category: cat }))}
                        className={`text-xs px-2.5 py-1 rounded-full border transition ${
                          isSelected
                            ? 'bg-orange-50 border-orange-400 text-orange-700 font-semibold'
                            : 'bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-600'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Field 5: Description & Ingredients */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor="menu-item-desc"
                    className="block text-sm font-semibold text-gray-800"
                  >
                    Description & Ingredients
                  </label>
                  <span className="text-xs text-gray-400 font-normal">Optional</span>
                </div>
                <textarea
                  id="menu-item-desc"
                  placeholder="e.g. 180g smashed beef patty, aged cheddar, caramelized onions, homemade secret burger sauce on a brioche bun."
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:outline-none transition"
                  rows={3}
                />
              </div>

              {/* Field 6: Stock & Ordering Availability */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1.5">
                  Stock & Ordering Availability
                </label>
                <div
                  onClick={() =>
                    setForm((prev) => ({ ...prev, isAvailable: !prev.isAvailable }))
                  }
                  className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition select-none ${
                    form.isAvailable
                      ? 'bg-emerald-50/60 border-emerald-300'
                      : 'bg-rose-50/60 border-rose-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-1.5 rounded-lg mt-0.5 ${
                        form.isAvailable
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {form.isAvailable ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <AlertCircle className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {form.isAvailable
                          ? 'In Stock & Ready to Order'
                          : 'Temporarily Sold Out'}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {form.isAvailable
                          ? 'Customers can browse and order this item immediately.'
                          : 'Customers will see this dish marked as Sold Out.'}
                      </p>
                    </div>
                  </div>

                  {/* Switch graphic */}
                  <div
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition duration-200 shrink-0 ${
                      form.isAvailable ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition duration-200 ${
                        form.isAvailable ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  disabled={saving || uploadingImage}
                  className="flex-1 border border-gray-300 text-gray-700 font-medium rounded-xl py-2.5 text-sm hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingImage || saving}
                  className="flex-1 bg-orange-500 text-white font-semibold rounded-xl py-2.5 text-sm hover:bg-orange-600 disabled:opacity-50 transition shadow-sm flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : editingItem ? (
                    'Update Dish'
                  ) : (
                    'Add Dish to Menu'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete menu item?"
        message="This dish will be permanently removed from your restaurant's menu."
        loading={deleting}
      />
    </div>
  );
}