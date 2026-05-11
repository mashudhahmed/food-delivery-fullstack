'use client';

import Link from 'next/link';
import { Restaurant } from '@/app/types';
import { Star, Heart } from 'lucide-react';

interface Props {
  restaurant: Restaurant;
}

export default function RestaurantCard({ restaurant }: Props) {
  // Safely convert rating to number (handles string, number, null, undefined)
  const getRatingValue = () => {
    const rating = restaurant.rating;
    if (typeof rating === 'number') return rating;
    if (typeof rating === 'string') return parseFloat(rating);
    return 4.5; // Default rating if none exists
  };

  const ratingNumber = getRatingValue();

  return (
    <Link href={`/restaurants/${restaurant.id}`}>
      <div className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer overflow-hidden">
        {/* Image Section */}
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
          
          {/* Favorite Button */}
          <button 
            className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition"
            onClick={(e) => {
              e.preventDefault();
              // Add to favorites logic here
            }}
          >
            <Heart className="w-4 h-4 text-gray-500 hover:text-red-500 transition-colors" />
          </button>
        </div>

        {/* Content Section */}
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