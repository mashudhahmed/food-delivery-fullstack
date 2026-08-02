'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFavoritesStore } from '@/stores/favoritesStore';
import { auth } from '@/lib/auth';
import RestaurantCard from '@/components/RestaurantCard';
import { Heart } from 'lucide-react';
import Link from 'next/link';

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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-7 h-7 text-red-500 fill-red-500" />
          <h1 className="text-2xl font-bold text-gray-800">My Favorites</h1>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No favorites yet</h2>
            <p className="text-gray-500 mb-6">Start adding restaurants you love!</p>
            <Link
              href="/"
              className="inline-block bg-orange-500 text-white px-6 py-2.5 rounded-full font-medium hover:bg-orange-600 transition"
            >
              Browse Restaurants
            </Link>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}