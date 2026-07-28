'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Star, ArrowLeft, Store } from 'lucide-react';
import { useFavoritesStore, type FavoriteItem } from '@/stores/favoritesStore';
import { auth } from '@/lib/auth';
import toast from 'react-hot-toast';

export default function FavoritesPage() {
  const router = useRouter();
  const { items, loading, loadFavorites, toggleFavorite, isFavorite } =
    useFavoritesStore();

  useEffect(() => {
    if (!auth.isAuthenticated()) {
      router.push('/');
      return;
    }
    loadFavorites();
  }, [loadFavorites, router]);

  const handleRemove = async (item: FavoriteItem) => {
    try {
      await toggleFavorite(item);
      toast.success('Removed from favorites');
    } catch {
      toast.error('Failed to update favorite');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-64 bg-gray-100 rounded-2xl border border-gray-100"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          type="button"
          onClick={() => router.back()}
          className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Favorites</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {items.length} saved restaurant{items.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 text-orange-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">
            No favorites yet
          </h2>
          <p className="text-sm text-gray-500 mb-6 max-w-sm">
            Tap the heart on any restaurant to save it here for quick access.
          </p>
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition"
          >
            <Store className="w-4 h-4" />
            Browse restaurants
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => {
            const imageSrc = item.imageUrl || item.image || item.restaurantImage;
            const displayName =
              item.restaurantName || item.name || 'Restaurant';

            return (
              <div
                key={item.id}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition"
              >
                {/* Image */}
                <div className="relative h-48 bg-gray-100">
                  {imageSrc ? (
                    <Image
                      src={imageSrc}
                      alt={displayName}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-300">
                      <Store className="w-12 h-12" />
                    </div>
                  )}

                  {/* Favorite toggle */}
                  <button
                    type="button"
                    onClick={() => handleRemove(item)}
                    className="absolute top-3 right-3 p-2 rounded-full bg-white/90 shadow-sm hover:bg-white transition"
                    aria-label="Remove from favorites"
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        isFavorite(item.id)
                          ? 'fill-red-500 text-red-500'
                          : 'text-gray-400'
                      }`}
                    />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/restaurants/${item.id}`}
                        className="font-semibold text-gray-900 hover:text-orange-600 transition line-clamp-1"
                      >
                        {displayName}
                      </Link>
                      {item.cuisineType && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {item.cuisineType}
                        </p>
                      )}
                    </div>
                    {item.rating !== undefined && item.rating > 0 && (
                      <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-lg shrink-0">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        {Number(item.rating).toFixed(1)}
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/restaurants/${item.id}`}
                    className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    View menu
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}