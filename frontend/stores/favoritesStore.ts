import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';

export interface FavoriteItem {
  id: string;
  name: string;
  image?: string;
  rating?: number;
}

interface FavoritesState {
  items: FavoriteItem[];
  loading: boolean;

  // Actions
  toggleFavorite: (restaurant: FavoriteItem) => Promise<void>;
  addFavorite: (restaurant: FavoriteItem) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  loadFavorites: () => Promise<void>;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      items: [],
      loading: false,

      isFavorite: (id: string) => {
        return get().items.some((item) => item.id === id);
      },

      addFavorite: (restaurant: FavoriteItem) => {
        const exists = get().items.some((item) => item.id === restaurant.id);
        if (!exists) {
          set({ items: [...get().items, restaurant] });
        }
      },

      removeFavorite: (id: string) => {
        set({
          items: get().items.filter((item) => item.id !== id),
        });
      },

      toggleFavorite: async (restaurant: FavoriteItem) => {
        const { items, addFavorite, removeFavorite } = get();
        const exists = items.some((item) => item.id === restaurant.id);

        // Optimistic update
        if (exists) {
          removeFavorite(restaurant.id);
        } else {
          addFavorite(restaurant);
        }

        // Sync with backend only if user is logged in
        if (!auth.isAuthenticated()) return;

        try {
          if (exists) {
            // Remove from backend
            await api.delete(`/favorites/${restaurant.id}`);
          } else {
            // Add to backend
            await api.post('/favorites', {
              restaurantId: restaurant.id,
            });
          }
        } catch (error) {
          // Rollback on error
          console.error('Failed to sync favorite:', error);
          if (exists) {
            addFavorite(restaurant);
          } else {
            removeFavorite(restaurant.id);
          }
        }
      },

      loadFavorites: async () => {
        if (!auth.isAuthenticated()) return;

        set({ loading: true });
        try {
          const { data } = await api.get('/favorites');
          const list = Array.isArray(data)
            ? data
            : data?.data || data?.items || [];

          // Normalize the shape
          const normalized: FavoriteItem[] = list.map((item: any) => ({
            id: item.restaurantId || item.restaurant?.id || item.id,
            name: item.restaurant?.name || item.name || 'Restaurant',
            image: item.restaurant?.imageUrl || item.restaurant?.image || item.image,
            rating: item.restaurant?.rating || item.rating,
          }));

          set({ items: normalized });
        } catch (error) {
          console.error('Failed to load favorites:', error);
        } finally {
          set({ loading: false });
        }
      },

      clearFavorites: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'quickbite-favorites',
      partialize: (state) => ({ items: state.items }), // only persist items
    }
  )
);