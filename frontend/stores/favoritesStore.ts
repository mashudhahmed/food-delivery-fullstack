import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';

export interface FavoriteItem {
  id: string;
  name: string;
  restaurantName?: string;
  image?: string;
  imageUrl?: string;
  restaurantImage?: string;
  rating?: number;
  cuisineType?: string;
}

interface FavoritesState {
  items: FavoriteItem[];
  loading: boolean;

  toggleFavorite: (restaurant: FavoriteItem) => Promise<void>;
  addFavorite: (restaurant: FavoriteItem) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  loadFavorites: () => Promise<void>;
  clearFavorites: () => void;
}

function normalizeFavorite(item: any): FavoriteItem {
  const id =
    item.restaurantId || item.restaurant?.id || item.id || '';
  const name =
    item.restaurantName ||
    item.restaurant?.name ||
    item.name ||
    'Restaurant';
  const image =
    item.restaurantImage ||
    item.restaurant?.imageUrl ||
    item.restaurant?.image ||
    item.imageUrl ||
    item.image ||
    undefined;
  const rating = item.restaurant?.rating ?? item.rating;
  const cuisineType =
    item.cuisineType || item.restaurant?.cuisineType || undefined;

  return {
    id,
    name,
    restaurantName: name,
    image,
    imageUrl: image,
    restaurantImage: image,
    rating,
    cuisineType,
  };
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
        const normalized = normalizeFavorite(restaurant);
        const exists = get().items.some((item) => item.id === normalized.id);
        if (!exists && normalized.id) {
          set({ items: [...get().items, normalized] });
        }
      },

      removeFavorite: (id: string) => {
        set({
          items: get().items.filter((item) => item.id !== id),
        });
      },

      toggleFavorite: async (restaurant: FavoriteItem) => {
        // Guard – never mutate state if guest
        if (!auth.isAuthenticated()) {
          return;
        }

        const { items, addFavorite, removeFavorite } = get();
        const normalized = normalizeFavorite(restaurant);
        const exists = items.some((item) => item.id === normalized.id);

        // Optimistic update
        if (exists) {
          removeFavorite(normalized.id);
        } else {
          addFavorite(normalized);
        }

        try {
          if (exists) {
            await api.delete(`/favorites/${normalized.id}`);
          } else {
            await api.post('/favorites', {
              restaurantId: normalized.id,
              restaurantName: normalized.name,
              restaurantImage: normalized.imageUrl || normalized.image,
              cuisineType: normalized.cuisineType,
            });
          }
        } catch (error) {
          console.error('Failed to sync favorite:', error);
          // Rollback
          if (exists) {
            addFavorite(normalized);
          } else {
            removeFavorite(normalized.id);
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

          const normalized: FavoriteItem[] = (list as any[])
            .map(normalizeFavorite)
            .filter((item) => !!item.id);

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
      partialize: (state) => ({ items: state.items }),
    },
  ),
);