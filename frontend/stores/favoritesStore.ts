import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

// Updated FavoriteItem interface with proper restaurant info
export interface FavoriteItem {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage?: string;
  cuisineType?: string;
  menuItemId?: string;
  menuItemName?: string;
  price?: number;
  imageUrl?: string;
  createdAt?: string;
  // Add restaurant details that might come from API
  restaurant?: {
    name: string;
    address: string;
    rating: number;
    imageUrl?: string;
  };
}

interface FavoritesStore {
  items: FavoriteItem[];
  isLoading: boolean;
  loadFavorites: () => Promise<void>;
  addFavorite: (restaurantId: string, restaurantName: string, restaurantImage?: string, cuisineType?: string) => Promise<void>;
  removeFavorite: (restaurantId: string) => Promise<void>;
  isFavorite: (restaurantId: string) => boolean;
  getFavoriteCount: () => number;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,

      loadFavorites: async () => {
        set({ isLoading: true });
        try {
          const response = await api.get('/favorites');
          // Ensure each item has the proper structure
          const favorites = (response.data || []).map((item: any) => ({
            ...item,
            restaurant: item.restaurant || {
              name: item.restaurantName,
              address: item.restaurantAddress || '',
              rating: item.rating || 0,
            }
          }));
          set({ items: favorites });
        } catch (error) {
          console.error('Failed to load favorites:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      addFavorite: async (restaurantId: string, restaurantName: string, restaurantImage?: string, cuisineType?: string) => {
        try {
          const existing = get().items.find(item => item.restaurantId === restaurantId);
          if (existing) {
            return;
          }
          
          const response = await api.post('/favorites', {
            restaurantId,
            restaurantName,
            restaurantImage,
            cuisineType,
          });
          
          const newItem = {
            ...response.data,
            restaurant: {
              name: restaurantName,
              address: '',
              rating: 0,
              imageUrl: restaurantImage,
            }
          };
          
          set((state) => ({ 
            items: [...state.items, newItem] 
          }));
          
          toast.success('Added to favorites');
          return response.data;
        } catch (error: any) {
          if (error.response?.status !== 409) {
            toast.error('Failed to add to favorites');
          }
          throw error;
        }
      },

      removeFavorite: async (restaurantId: string) => {
        try {
          await api.delete(`/favorites/${restaurantId}`);
          
          set((state) => ({ 
            items: state.items.filter((item) => item.restaurantId !== restaurantId) 
          }));
          
          toast.success('Removed from favorites');
        } catch (error: any) {
          if (error.response?.status === 404) {
            set((state) => ({ 
              items: state.items.filter((item) => item.restaurantId !== restaurantId) 
            }));
            toast.success('Removed from favorites');
          } else {
            toast.error('Failed to remove from favorites');
          }
          throw error;
        }
      },

      isFavorite: (restaurantId: string) => {
        return get().items.some((item) => item.restaurantId === restaurantId);
      },

      getFavoriteCount: () => {
        return get().items.length;
      },

      clearFavorites: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'favorites-storage',
    }
  )
);