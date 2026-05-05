'use client';

import Link from 'next/link';
import { Restaurant } from '@/app/types';

interface Props {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: Props) {
  return (
    <Link href={`/restaurants/${restaurant.id}`}>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
        <div className="h-48 bg-linear-to-r from-orange-400 to-orange-600 flex items-center justify-center">
          <span className="text-6xl">🍔</span>
        </div>
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-xl font-semibold text-gray-800">{restaurant.name}</h3>
            <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded">
              <span className="text-yellow-500">⭐</span>
              <span className="text-sm font-medium">{restaurant.rating?.toFixed(1) || 'New'}</span>
            </div>
          </div>
          <p className="text-gray-600 text-sm mb-2 line-clamp-2">{restaurant.description}</p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{restaurant.cuisineType}</span>
            <span>•</span>
            <span className={restaurant.isOpen ? 'text-green-600' : 'text-red-600'}>
              {restaurant.isOpen ? 'Open Now' : 'Closed'}
            </span>
          </div>
          <div className="mt-3 text-sm text-gray-500">
            📍 {restaurant.address}
          </div>
        </div>
      </div>
    </Link>
  );
}