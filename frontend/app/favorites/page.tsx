'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { auth } from '@/lib/auth';
import RestaurantCard from '@/components/RestaurantCard';
import { Heart } from 'lucide-react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function FavoritesPage() {
  const router = useRouter();
  const { items, loading, loadFavorites } = useFavoritesStore();

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.replace('/');
      return;
    }
    loadFavorites();
  }, [router, loadFavorites]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      {items.length === 0 ? (
        <div className="max-w-md w-full text-center">
          {/* Subtle circle icon background like the Cart page */}
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Heart className="w-10 h-10 text-gray-400" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No favorites yet</h2>
          <p className="text-gray-500 mb-8">Start adding restaurants you love!</p>
          
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-orange-600 transition shadow-sm shadow-orange-200"
          >
            Browse Restaurants
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((item) => (
              <RestaurantCard
                key={item.id}
                restaurant={{
                  id: item.id,
                  name: item.name || item.restaurantName || 'Restaurant',
                  imageUrl: item.imageUrl || item.image,
                  rating: item.rating,
                  cuisineType: item.cuisineType,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}