'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { unwrapPaginated, ensureArray } from '@/lib/unwrapPaginated';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Upload, ImageIcon, Loader2 } from 'lucide-react';
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
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    imageUrl: '',
    isAvailable: true,
  });

  // ✅ UseCallback to prevent infinite loops
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

  function openCreate() {
    setEditingItem(null);
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
    setForm({
      name: item.name || '',
      description: item.description || '',
      price: String(item.price || ''),
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
      toast.error('Please upload a valid image file');
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
    if (!selectedRestaurantId) return;

    const payload: Record<string, any> = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      category: form.category.trim(),
      isAvailable: form.isAvailable,
    };

    if (form.imageUrl) {
      payload.imageUrl = form.imageUrl;
    }

    try {
      if (editingItem) {
        await api.patch(`/menu/${editingItem.id}`, payload);
        toast.success('Menu item updated');
      } else {
        await api.post(`/menu/restaurant/${selectedRestaurantId}`, payload);
        toast.success('Menu item created');
      }
      setShowForm(false);
      fetchMenu(selectedRestaurantId);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to save'));
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      setDeleting(true);
      await api.delete(`/menu/${deleteId}`);
      toast.success('Item deleted');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold">Menu Management</h1>
        <div className="flex gap-3">
          {restaurants.length > 1 && (
            <select
              value={selectedRestaurantId}
              onChange={(e) => setSelectedRestaurantId(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          {/* ✅ FIXED: Added onClick handler */}
          <button
            onClick={openCreate}
            disabled={!selectedRestaurantId}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {restaurants.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No restaurants found. Create a restaurant first.
        </div>
      ) : menuItems.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          No menu items yet. Add your first item.
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-4">Image</th>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Category</th>
                <th className="text-left p-4">Price</th>
                <th className="text-left p-4">Status</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {menuItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-4">
                    {item.imageUrl ? (
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden border">
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </td>
                  <td className="p-4 font-medium">{item.name}</td>
                  <td className="p-4">{item.category || '—'}</td>
                  <td className="p-4">৳{Number(item.price).toFixed(0)}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        item.isAvailable !== false
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {item.isAvailable !== false ? 'Available' : 'Unavailable'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 hover:bg-gray-100 rounded"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteId(item.id)}
                      className="p-1.5 hover:bg-red-50 rounded text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl p-6 w-full max-w-md space-y-4"
          >
            <h2 className="text-lg font-bold">
              {editingItem ? 'Edit Item' : 'Add Menu Item'}
            </h2>
            {/* Food Image upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Food Image
              </label>
              <div className="flex items-center gap-4">
                {form.imageUrl ? (
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 shrink-0">
                    <Image
                      src={form.imageUrl}
                      alt="Food preview"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                  {uploadingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                  ) : (
                    <Upload className="w-4 h-4 text-gray-500" />
                  )}
                  <span>{uploadingImage ? 'Uploading...' : 'Upload Image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <input
              required
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <textarea
              placeholder="Description"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full border rounded-lg px-3 py-2"
              rows={2}
            />
            <input
              required
              type="number"
              min="0"
              step="0.01"
              placeholder="Price"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <input
              placeholder="Category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isAvailable}
                onChange={(e) =>
                  setForm({ ...form, isAvailable: e.target.checked })
                }
              />
              Available
            </label>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 border rounded-lg py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uploadingImage}
                className="flex-1 bg-orange-500 text-white rounded-lg py-2 disabled:opacity-50"
              >
                {editingItem ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <DeleteConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete menu item?"
        message="This action cannot be undone."
        loading={deleting}
      />
    </div>
  );
}