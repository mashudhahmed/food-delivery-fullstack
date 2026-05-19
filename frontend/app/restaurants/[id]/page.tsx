'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Restaurant, MenuItem } from '@/types';
import MenuItemCard from '@/components/MenuItemCard';
import toast from 'react-hot-toast';
import { Star, MapPin, Phone, Clock, ChevronRight, Search, Info, ShoppingBag, Truck, Minus, Plus, Trash2 } from 'lucide-react';
import { useCartStore } from '@/stores/cartStore';

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { items, addItem, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore();

  // Safe rating conversion function
  const getRatingValue = (rating: any) => {
    if (typeof rating === 'number') return rating;
    if (typeof rating === 'string') return parseFloat(rating);
    return 4.5;
  };

  useEffect(() => {
    fetchRestaurantDetails();
  }, [id]);

  // Clear cart when restaurant changes or when restaurant is closed
  useEffect(() => {
    if (restaurant && !restaurant.isOpen && items.length > 0) {
      clearCart();
      toast.error('Restaurant is closed. Cart has been cleared.');
    }
  }, [restaurant?.isOpen]);

  const fetchRestaurantDetails = async () => {
    try {
      setLoading(true);
      const [restaurantRes, menuRes] = await Promise.all([
        api.get(`/restaurants/${id}`),
        api.get(`/menu/restaurant/${id}`),
      ]);
      setRestaurant(restaurantRes.data);
      setMenuItems(menuRes.data);
    } catch (error) {
      toast.error('Failed to load restaurant details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
    } else {
      updateQuantity(itemId, newQuantity);
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }
    if (!restaurant?.isOpen) {
      toast.error('Restaurant is closed. Cannot proceed to checkout.');
      return;
    }
    router.push('/checkout');
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
  const isOpen = restaurant.isOpen;
  const subtotal = getTotalPrice();
  const platformFee = 20;
  const deliveryFee = items.length > 0 ? 50 : 0;
  const total = subtotal + platformFee + deliveryFee;

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
        <div className="flex flex-col md:flex-row gap-6 mb-8">
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

            {/* Open/Closed Status Badge */}
            <div className="flex items-center gap-2 mb-2">
              {isOpen ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  Open Now
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                  Closed
                </span>
              )}
            </div>

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

        {/* Closed Restaurant Warning Banner */}
        {!isOpen && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-500 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-800">Restaurant is Currently Closed</p>
                <p className="text-sm text-amber-700 mt-1">
                  This restaurant is not accepting orders right now. 
                  Please check back during opening hours.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Menu Section Header */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Menu</h2>
        </div>

        {/* Search Bar + Categories - Same Row */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
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

          {/* Category Tabs - Right side (scrollable) */}
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

        {/* Menu Items Section with Payment Card Sidebar */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Menu Items - 2 Column Grid */}
          <div className="flex-1">
            {filteredItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No menu items found
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredItems.map((item) => (
                  <MenuItemCard 
                    key={item.id} 
                    item={item} 
                    restaurantName={restaurant.name}
                    restaurantId={restaurant.id}
                    disabled={!isOpen}  // Disable when restaurant is closed
                  />
                ))}
              </div>
            )}
          </div>

          {/* Sticky Payment Card - Fixed Size with Internal Scroll */}
          {items.length > 0 && isOpen && (
            <div className="lg:w-96 shrink-0">
              <div className="sticky top-24">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 h-125 flex flex-col overflow-hidden">
                  {/* Header - Fixed */}
                  <div className="p-4 border-b border-gray-100 shrink-0">
                    <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-orange-500" />
                      Your items
                    </h3>
                  </div>

                  {/* Cart Items - Scrollable */}
                  <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
                    {items.map((item) => (
                      <div key={item.id} className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-800">{item.name}</h4>
                            <p className="text-orange-600 font-bold text-sm mt-1">
                              ৳{item.price}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                              className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="ml-1 text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Price Section - Fixed at bottom */}
                  <div className="shrink-0">
                    <div className="p-4 border-t border-gray-100 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="text-gray-800">৳{subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Platform Fee</span>
                        <span className="text-gray-800">৳{platformFee.toFixed(2)}</span>
                      </div>

                      <div className="pt-2">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-sm text-gray-600">Cutlery</span>
                            <p className="text-xs text-gray-400">No cutlery provided. Thanks for reducing waste!</p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-3 mt-2">
                        <div className="flex justify-between font-bold">
                          <span className="text-gray-900">Total (incl. fees and tax)</span>
                          <span className="text-orange-600">৳{total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border-t border-gray-100">
                      <button
                        onClick={handleCheckout}
                        className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 transition"
                      >
                        Review payment and address
                      </button>
                      <button className="w-full text-sm text-gray-500 hover:text-orange-500 transition text-center mt-2">
                        See summary
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Show message when cart has items but restaurant is closed */}
          {items.length > 0 && !isOpen && (
            <div className="lg:w-96 shrink-0">
              <div className="sticky top-24">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 text-center">
                  <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="font-medium text-gray-800">Restaurant is Closed</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Your cart has been cleared because the restaurant is no longer open.
                  </p>
                  <button
                    onClick={() => clearCart()}
                    className="mt-4 text-orange-500 hover:text-orange-600 text-sm"
                  >
                    Clear Cart
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}