'use client';

import { useCartStore } from '@/app/stores/cartStore';
import { MenuItem } from '@/app/types';
import toast from 'react-hot-toast';
import { Plus, Minus } from 'lucide-react';
import { useEffect, useState } from 'react';

interface Props {
  item: MenuItem;
  restaurantName: string;
  restaurantId: string;
}

export default function MenuItemCard({ item, restaurantName, restaurantId }: Props) {
  const { items, addItem, removeItem, updateQuantity } = useCartStore();
  const [quantity, setQuantity] = useState(0);

  // Sync quantity with cart store
  useEffect(() => {
    const cartItem = items.find(i => i.id === item.id);
    setQuantity(cartItem?.quantity || 0);
  }, [items, item.id]);

  const handleAddToCart = () => {
    if (!item.isAvailable) {
      toast.error('This item is currently unavailable');
      return;
    }
    addItem(item, restaurantName, 1);
    toast.success(`Added ${item.name} to cart`);
  };

  const handleRemoveFromCart = () => {
    if (quantity > 0) {
      if (quantity === 1) {
        removeItem(item.id);
      } else {
        updateQuantity(item.id, quantity - 1);
      }
      toast.success(`Removed 1 ${item.name} from cart`);
    }
  };

  // Get emoji based on category
  const getCategoryEmoji = () => {
    const categoryEmojis: Record<string, string> = {
      'Pizza': '🍕',
      'Burger': '🍔',
      'Biryani': '🍛',
      'Curry': '🍲',
      'Dessert': '🍰',
      'Beverage': '🥤',
      'Appetizer': '🍿',
      'Noodles': '🍜',
      'Rice Bowl': '🍚',
      'BBQ': '🔥',
      'Stew': '🍲',
      'Fried': '🍗',
      'Sandwich': '🥪',
      'Meat Box': '🍖',
      'Waffle': '🧇',
      'Pastry': '🥐',
      'Ice Cream': '🍦',
      'Salad': '🥗',
      'Soup': '🥣',
      'Seafood': '🦐',
      'Breakfast': '🍳',
    };
    return categoryEmojis[item.category] || '🍽️';
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 flex gap-4 transition-all hover:shadow-sm">
      {/* Left Content: Text Details */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800 leading-tight">
            {item.name}
          </h3>
          <p className="text-gray-700 font-medium mt-1">
            ৳{item.price}
          </p>
          <p className="text-gray-400 text-sm mt-2 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>
        
        {!item.isAvailable && (
          <p className="text-xs text-red-500 font-medium mt-2">Currently unavailable</p>
        )}
      </div>

      {/* Right Content: Emoji & Action Button */}
      <div className="relative w-28 h-28 shrink-0">
        <div className="w-full h-full rounded-xl overflow-hidden bg-linear-to-br from-orange-100 to-orange-200 flex items-center justify-center">
          <span className="text-5xl">{getCategoryEmoji()}</span>
        </div>

        {/* Floating Action Button */}
        <div className="absolute -bottom-2 -right-2">
          {quantity > 0 ? (
            <div className="flex items-center bg-orange-500 text-white rounded-full p-1 shadow-lg ring-2 ring-white">
              <button 
                onClick={handleRemoveFromCart}
                className="w-7 h-7 flex items-center justify-center hover:bg-orange-600 rounded-full transition"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-2 text-sm font-bold min-w-5 text-center">
                {quantity}
              </span>
              <button 
                onClick={handleAddToCart}
                className="w-7 h-7 flex items-center justify-center hover:bg-orange-600 rounded-full transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={!item.isAvailable}
              className={`w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-95 ring-2 ring-white ${
                item.isAvailable 
                  ? 'bg-orange-500 text-white hover:bg-orange-600' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Plus className="w-6 h-6 stroke-[3px]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}