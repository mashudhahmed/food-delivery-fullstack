import { create } from 'zustand';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface FavoriteItem {
  id: string;
  restaurantId: string;
  restaurantName: string;
  menuItemId: string;
  menuItemName: string;
  price: number;
  imageUrl?: string;
}

interface FavoritesStore {
  items: FavoriteItem[];
  isLoading: boolean;
  loadFavorites: () => Promise<void>;
  addFavorite: (item: Omit<FavoriteItem, 'id'>) => Promise<void>;
  removeFavorite: (id: string) => Promise<void>;
  isFavorite: (menuItemId: string) => boolean;
}

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  items: [],
  isLoading: false,

  loadFavorites: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/favorites');
      set({ items: response.data || [] });
    } catch (error) {
      console.error('Failed to load favorites:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addFavorite: async (item) => {
    try {
      const response = await api.post('/favorites', item);
      set((state) => ({ items: [...state.items, response.data] }));
      toast.success('Added to favorites');
    } catch (error) {
      toast.error('Failed to add to favorites');
    }
  },

  removeFavorite: async (id: string) => {
    try {
      await api.delete(`/favorites/${id}`);
      set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
      toast.success('Removed from favorites');
    } catch (error) {
      toast.error('Failed to remove from favorites');
    }
  },

  isFavorite: (menuItemId: string) => {
    return get().items.some((item) => item.menuItemId === menuItemId);
  },
}));