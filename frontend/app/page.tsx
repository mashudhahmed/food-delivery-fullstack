'use client';

import { useEffect, useState } from 'react';
import { api } from './lib/api';
import { Restaurant } from './types';
import RestaurantCard from '@/components/RestaurantCard';
import toast from 'react-hot-toast';

export default function HomePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ cuisineType: '', isOpen: '' });

  useEffect(() => {
    fetchRestaurants();
  }, [filters]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.cuisineType) params.append('cuisineType', filters.cuisineType);
      if (filters.isOpen) params.append('isOpen', filters.isOpen);

      const response = await api.get(`/restaurants?${params.toString()}`);
      setRestaurants(response.data);
    } catch (error) {
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Restaurants Near You</h1>

      {/* Filters */}
      <div className="flex gap-4 mb-8">
        <select
          className="px-3 py-2 border rounded-md"
          onChange={(e) => setFilters({ ...filters, cuisineType: e.target.value })}
        >
          <option value="">All Cuisines</option>
          <option value="Italian">Italian</option>
          <option value="Chinese">Chinese</option>
          <option value="Mexican">Mexican</option>
          <option value="Indian">Indian</option>
        </select>

        <select
          className="px-3 py-2 border rounded-md"
          onChange={(e) => setFilters({ ...filters, isOpen: e.target.value })}
        >
          <option value="">All</option>
          <option value="true">Open Now</option>
          <option value="false">Closed</option>
        </select>
      </div>

      {/* Restaurant Grid */}
      {loading ? (
        <div className="text-center py-12">Loading...</div>
      ) : restaurants.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No restaurants found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      )}
    </div>
  );
}