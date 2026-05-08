'use client';

import { useCartStore } from '@/app/stores/cartStore';
import { MenuItem } from '@/app/types';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

interface Props {
  item: MenuItem;
  restaurantName: string;
  restaurantId: string;
}

export default function MenuItemCard({ item, restaurantName, restaurantId }: Props) {
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    if (!item.isAvailable) {
      toast.error('This item is currently unavailable');
      return;
    }
    addItem(item, restaurantName, 1);
    toast.success(`Added ${item.name} to cart`);
  };

  // Calculate discounted price (20% off for visual effect)
  const originalPrice = Math.round(item.price * 1.2);

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-4 flex justify-between items-center hover:shadow-md transition-shadow">
      {/* Left side - Item details */}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-800 mb-1">
          {item.name}
        </h3>
        
        <p className="text-gray-500 text-sm mb-2 line-clamp-2">
          {item.description}
        </p>
        
        <div className="flex items-center gap-2">
          <span className="text-orange-600 font-bold">
            ৳{item.price}
          </span>
          {item.isAvailable && (
            <span className="text-xs text-gray-400 line-through">
              ৳{originalPrice}
            </span>
          )}
        </div>
        
        {!item.isAvailable && (
          <span className="text-xs text-red-500 mt-1 inline-block">
            Currently unavailable
          </span>
        )}
      </div>

      {/* Right side - Add button (circular) */}
      <button
        onClick={handleAddToCart}
        disabled={!item.isAvailable}
        className={`ml-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
          item.isAvailable
            ? 'bg-orange-500 text-white hover:bg-orange-600'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
        }`}
      >
        <Plus className="w-5 h-5" />
      </button>
    </div>
  );
}