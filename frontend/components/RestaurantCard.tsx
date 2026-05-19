'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Restaurant } from '@/types';
import { Star, Heart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { auth } from '@/lib/api';
import { useFavoritesStore } from '@/stores/favoritesStore';
import toast from 'react-hot-toast';

interface Props {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: Props) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Use the favorites store
  const { isFavorite, addFavorite, removeFavorite, loadFavorites } = useFavoritesStore();
  const isFavorited = isFavorite(restaurant.id);

  const getRatingValue = () => {
    const rating = restaurant.rating;
    if (typeof rating === 'number') return rating;
    if (typeof rating === 'string') return parseFloat(rating);
    return 4.5;
  };

  const ratingNumber = getRatingValue();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = auth.getCurrentUser();
    setIsAuthenticated(!!token && !!user);
    
    // Load favorites if authenticated
    if (token && user && user.role === 'customer') {
      loadFavorites();
    }
  }, []);

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      toast.error('Please login to add favorites');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
      return;
    }

    setIsLoading(true);

    try {
      if (isFavorited) {
        // Remove from favorites - this will update the store
        await removeFavorite(restaurant.id);
        // Force a reload of favorites to ensure sync
        await loadFavorites();
      } else {
        // Add to favorites
        await addFavorite(
          restaurant.id,
          restaurant.name,
          restaurant.imageUrl,
          restaurant.cuisineType
        );
        // Force a reload of favorites to ensure sync
        await loadFavorites();
      }
    } catch (error: any) {
      console.error('Favorite error:', error);
      if (error.response?.status !== 409) {
        toast.error(error.response?.data?.message || 'Something went wrong');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Link href={`/restaurants/${restaurant.id}`}>
      <div className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden">
        <div className="relative h-40 overflow-hidden bg-linear-to-br from-orange-400 to-red-500">
          {restaurant.imageUrl ? (
            <img
              src={restaurant.imageUrl}
              alt={restaurant.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl">🍔</span>
            </div>
          )}
          
          {/* Heart button - now synced with store */}
          <button 
            className={`absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center transition-all ${
              isLoading ? 'opacity-50 cursor-wait' : 'hover:bg-white'
            }`}
            onClick={handleFavoriteClick}
            disabled={isLoading}
          >
            <Heart 
              className={`w-4 h-4 transition-colors ${
                isFavorited 
                  ? 'text-red-500 fill-red-500' 
                  : 'text-gray-500 hover:text-red-500'
              }`} 
            />
          </button>
        </div>

        <div className="p-3">
          <div className="flex justify-between items-start mb-1">
            <h3 className="font-bold text-gray-800 group-hover:text-orange-500 transition-colors text-base line-clamp-1">
              {restaurant.name}
            </h3>
            <div className="flex items-center gap-1 bg-green-50 px-1.5 py-0.5 rounded">
              <Star className="w-3 h-3 text-green-600 fill-green-600" />
              <span className="text-xs font-semibold text-green-600">
                {ratingNumber.toFixed(1)}
              </span>
            </div>
          </div>
          
          <p className="text-gray-500 text-xs mb-2">
            {restaurant.cuisineType} • {restaurant.isOpen ? 'Open Now' : 'Closed'}
          </p>
          
          <p className="text-xs text-gray-400 line-clamp-1">
            {restaurant.address}
          </p>
        </div>
      </div>
    </Link>
  );
}