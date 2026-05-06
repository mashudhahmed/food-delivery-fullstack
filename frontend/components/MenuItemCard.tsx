'use client';

import { useCartStore } from '@/app/stores/cartStore';
import { MenuItem } from '@/app/types';
import toast from 'react-hot-toast';

interface Props {
  item: MenuItem;
  restaurantName: string;
  restaurantId: string;  // Keep this for validation if needed, but don't pass to cart
}

export default function MenuItemCard({ item, restaurantName, restaurantId }: Props) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    if (!item.isAvailable) {
      toast.error('This item is currently unavailable');
      return;
    }
    // FIX: Remove restaurantId - only pass item, restaurantName, quantity
    addItem(item, restaurantName, 1);
    toast.success(`Added ${item.name} to cart`);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 flex justify-between items-center">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-semibold text-gray-800">{item.name}</h3>
          {!item.isAvailable && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">Unavailable</span>
          )}
        </div>
        <p className="text-gray-600 text-sm mb-2">{item.description}</p>
        <div className="flex items-center gap-3">
          <span className="text-orange-600 font-bold">৳{item.price}</span>
          <span className="text-xs text-gray-400">{item.category}</span>
        </div>
      </div>
      <button
        onClick={handleAddToCart}
        disabled={!item.isAvailable}
        className={`ml-4 px-4 py-2 rounded-md transition-colors ${
          item.isAvailable
            ? 'bg-orange-600 text-white hover:bg-orange-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        Add to Cart
      </button>
    </div>
  );
}