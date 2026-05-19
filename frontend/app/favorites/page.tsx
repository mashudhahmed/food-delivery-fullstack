'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { api } from '@/lib/api';
import { Heart, ShoppingBag, Trash2, Star, MapPin } from 'lucide-react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { useCartStore } from '@/stores/cartStore';
import { useFavoritesStore } from '@/stores/favoritesStore';

interface FavoriteItem {
  id: string;
  restaurantId: string;
  restaurantName: string;
  menuItemId?: string;
  menuItemName?: string;
  price?: number;
  imageUrl?: string;
  restaurant?: {
    name: string;
    address: string;
    rating: number;
  };
}

export default function FavoritesPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);
  
  // Use favorites store
  const { items: favorites, loadFavorites, removeFavorite: removeFromStore } = useFavoritesStore();
  const addItemToCart = useCartStore((state) => state.addItem);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    
    if (currentUser.role !== 'customer') {
      router.push('/');
      return;
    }
    
    setUser(currentUser);
    loadFavorites();
    setLoading(false);
  }, []);

  const removeFavorite = async (restaurantId: string, favoriteId: string) => {
    setRemovingId(favoriteId);
    try {
      // This will update the store and all components using it
      await removeFromStore(restaurantId);
      toast.success('Removed from favorites');
    } catch (error) {
      toast.error('Failed to remove from favorites');
    } finally {
      setRemovingId(null);
    }
  };

  const addToCart = async (item: FavoriteItem) => {
    setAddingToCartId(item.id);
    try {
      const menuItem = {
        id: item.menuItemId || item.id,
        name: item.menuItemName || item.restaurantName,
        price: item.price || 0,
        description: '',
        category: '',
        isAvailable: true,
        restaurantId: item.restaurantId,
        restaurantName: item.restaurantName,
      };
      
      addItemToCart(menuItem, item.restaurantName, 1);
      toast.success(`Added ${menuItem.name} to cart`, {
        icon: '🛒',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add to cart');
    } finally {
      setAddingToCartId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            <h1 className="text-3xl font-bold text-gray-800">My Favorites</h1>
          </div>
          <p className="text-gray-500 mt-2">
            {favorites.length} favorite{favorites.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Favorites List */}
        {favorites.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-12 h-12 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No favorites yet</h3>
            <p className="text-gray-500 mb-6">Start adding your favorite restaurants</p>
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition"
            >
              Browse Restaurants
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition group">
                {/* Image */}
                <div className="relative h-48 bg-gray-100">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.restaurantName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-6xl">
                      🍽️
                    </div>
                  )}
                  <button
                    onClick={() => removeFavorite(item.restaurantId, item.id)}
                    disabled={removingId === item.id}
                    className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-red-50 transition"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4">
                  {/* Restaurant Info */}
                  <button
                    onClick={() => router.push(`/restaurants/${item.restaurantId}`)}
                    className="block w-full text-left"
                  >
                    <h3 className="font-semibold text-gray-800 hover:text-orange-500 transition">
                      {item.restaurant?.name || item.restaurantName}
                    </h3>
                  </button>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <MapPin className="w-3 h-3" />
                    <span>{item.restaurant?.address?.split(',')[0] || 'Restaurant'}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm text-gray-600">{item.restaurant?.rating || 'New'}</span>
                  </div>

                  {/* Menu Item (if exists) */}
                  {item.menuItemName && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <h4 className="font-medium text-gray-800">{item.menuItemName}</h4>
                      <p className="text-lg font-bold text-orange-500 mt-1">৳{item.price}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    {item.menuItemName ? (
                      <button
                        onClick={() => addToCart(item)}
                        disabled={addingToCartId === item.id}
                        className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition font-medium flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                      >
                        {addingToCartId === item.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                            Adding...
                          </>
                        ) : (
                          <>
                            <ShoppingBag className="w-4 h-4" />
                            Add to Cart
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(`/restaurants/${item.restaurantId}`)}
                        className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition font-medium text-sm"
                      >
                        View Restaurant
                      </button>
                    )}
                    <button
                      onClick={() => router.push(`/restaurants/${item.restaurantId}`)}
                      className="flex-1 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-center text-sm"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}