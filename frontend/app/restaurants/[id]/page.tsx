'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/app/lib/api';
import { Restaurant, MenuItem } from '@/app/types';
import MenuItemCard from '@/components/MenuItemCard';
import toast from 'react-hot-toast';
import { Star, MapPin, Phone, Clock } from 'lucide-react';

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Safe rating conversion function
  const getRatingValue = (rating: any) => {
    if (typeof rating === 'number') return rating;
    if (typeof rating === 'string') return parseFloat(rating);
    return 0;
  };

  useEffect(() => {
    fetchRestaurantDetails();
  }, [id]);

  const fetchRestaurantDetails = async () => {
    try {
      setLoading(true);
      const [restaurantRes, menuRes] = await Promise.all([
        api.get(`/restaurants/${id}`),
        api.get(`/restaurants/${id}/menu`),
      ]);
      setRestaurant(restaurantRes.data);
      setMenuItems(menuRes.data);
    } catch (error) {
      toast.error('Failed to load restaurant details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">Loading...</div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-red-600">Restaurant not found</div>
      </div>
    );
  }

  const ratingNumber = getRatingValue(restaurant.rating);

  // Group menu items by category
  const groupedItems = menuItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Restaurant Header */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="h-64 bg-linear-to-r from-orange-400 to-orange-600 flex items-center justify-center">
          <span className="text-8xl">🍽️</span>
        </div>
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">{restaurant.name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-semibold text-gray-700">{ratingNumber.toFixed(1)}</span>
                </div>
                <span className="text-gray-400">•</span>
                <span className={restaurant.isOpen ? 'text-green-600' : 'text-red-600'}>
                  {restaurant.isOpen ? 'Open Now' : 'Closed'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">{restaurant.cuisineType}</div>
              <div className="text-sm text-gray-500 mt-1">📞 {restaurant.phone}</div>
            </div>
          </div>
          <p className="text-gray-600 mb-4">{restaurant.description}</p>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="w-4 h-4" />
            <span>{restaurant.address}</span>
          </div>
        </div>
      </div>

      {/* Menu Section */}
      <h2 className="text-2xl font-bold mb-6">Menu</h2>
      {Object.keys(groupedItems).length === 0 ? (
        <div className="text-center py-8 text-gray-500">No menu items available</div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xl font-semibold mb-4 text-orange-600">{category}</h3>
              <div className="space-y-3">
                {items.map((item) => (
                  <MenuItemCard 
                    key={item.id} 
                    item={item} 
                    restaurantName={restaurant.name}
                    restaurantId={restaurant.id}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}