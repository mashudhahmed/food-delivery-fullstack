'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/app/lib/api';
import { Restaurant, MenuItem } from '@/app/types';
import MenuItemCard from '@/components/MenuItemCard';
import toast from 'react-hot-toast';
import { Star, MapPin, Phone, Clock, ChevronRight, Search, Info } from 'lucide-react';
import Image from 'next/image';

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Safe rating conversion function
  const getRatingValue = (rating: any) => {
    if (typeof rating === 'number') return rating;
    if (typeof rating === 'string') return parseFloat(rating);
    return 4.5;
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

  // Get unique categories for tabs
  const categories = ['all', ...Object.keys(groupedItems)];
  
  // Filter menu items based on selected category and search term
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Get item count for each category
  const getCategoryCount = (category: string) => {
    if (category === 'all') return menuItems.length;
    return groupedItems[category]?.length || 0;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 md:px-8 py-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-gray-500 mb-6 flex-wrap">
          <span>Dhaka</span>
          <ChevronRight className="w-4 h-4" />
          <span>Restaurant List</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-800 font-medium">{restaurant.name}</span>
        </div>

        {/* Restaurant Header with Image on Left */}
        <div className="flex flex-col md:flex-row gap-6 mb-6">
          {/* Restaurant Image */}
          <div className="md:w-48 h-48 rounded-xl overflow-hidden bg-linear-to-r from-orange-400 to-orange-600 shrink-0">
            {restaurant.imageUrl ? (
              <img 
                src={restaurant.imageUrl} 
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-5xl">🍽️</span>
              </div>
            )}
          </div>

          {/* Restaurant Info */}
          <div className="flex-1">
            {/* Cuisine Badges */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-sm text-gray-600">{restaurant.cuisineType}</span>
              <span className="text-gray-400">·</span>
              <span className="text-sm text-gray-600">Beverage</span>
            </div>

            {/* Restaurant Name */}
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{restaurant.name}</h1>

            {/* Order Info */}
            <p className="text-gray-600 text-sm mb-3">No min. order</p>

            {/* Rating and More Info */}
            <div className="flex items-center gap-4 mb-3 flex-wrap">
              <button className="flex items-center gap-1 text-sm text-gray-700 hover:text-orange-500 transition">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-medium">{ratingNumber.toFixed(1)}/5</span>
                <span className="text-gray-400">(100+)</span>
                <span className="text-gray-400 ml-1">See reviews</span>
              </button>
              <button className="flex items-center gap-1 text-sm text-gray-700 hover:text-orange-500 transition">
                <Info className="w-4 h-4" />
                <span>More info</span>
              </button>
            </div>

            {/* Address with Map Link */}
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
              <span>
                {restaurant.address} · 590 m away · 
                <a 
                  href={`https://maps.google.com/?q=${encodeURIComponent(restaurant.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-orange-500 hover:underline ml-1"
                >
                  Open in Maps
                </a>
              </span>
            </div>
          </div>
        </div>

        {/* Search Bar and Categories - Same Row (No Gap) */}
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Search Bar - Left side */}
          <div className="relative max-w-md w-full md:w-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search in menu"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 text-gray-800 placeholder-gray-400 rounded-full border border-gray-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-white"
            />
          </div>

          {/* Category Tabs - No padding */}
          <div className="overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${
                    selectedCategory === category
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {category === 'all' ? 'Popular' : category} ({getCategoryCount(category)})
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Menu Items List */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No menu items found
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {filteredItems.map((item) => (
              <MenuItemCard 
                key={item.id} 
                item={item} 
                restaurantName={restaurant.name}
                restaurantId={restaurant.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}