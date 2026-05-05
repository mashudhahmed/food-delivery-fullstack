import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MenuItem } from '../types';

export interface CartItem extends MenuItem {
  quantity: number;
  restaurantName: string;
  restaurantId: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: MenuItem, restaurantName: string, restaurantId: string, quantity?: number) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  getRestaurantId: () => string | null;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, restaurantName, restaurantId, quantity = 1) => {
        const items = get().items;
        const existingItem = items.find((i) => i.id === item.id);

        // Check if trying to add from different restaurant
        if (items.length > 0 && items[0].restaurantId !== restaurantId) {
          alert('You can only order from one restaurant at a time. Clear cart or checkout first.');
          return;
        }

        if (existingItem) {
          set({
            items: items.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + quantity } : i
            ),
          });
        } else {
          set({
            items: [
              ...items,
              {
                ...item,
                quantity,
                restaurantName,
                restaurantId,
              },
            ],
          });
        }
      },

      removeItem: (itemId) => {
        set({ items: get().items.filter((i) => i.id !== itemId) });
      },

      updateQuantity: (itemId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(itemId);
          return;
        }
        set({
          items: get().items.map((i) => (i.id === itemId ? { ...i, quantity } : i)),
        });
      },

      clearCart: () => set({ items: [] }),

      getTotalPrice: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getRestaurantId: () => {
        const items = get().items;
        return items.length > 0 ? items[0].restaurantId : null;
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);