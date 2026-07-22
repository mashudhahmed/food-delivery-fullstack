// app/page.tsx
'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import { Restaurant } from '../types';
import RestaurantCard from '@/components/RestaurantCard';
import toast from 'react-hot-toast';
import { Filter, X, Star, Clock, SlidersHorizontal, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useAddressStore } from '@/stores/addressStore';

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  const [cuisineSearchTerm, setCuisineSearchTerm] = useState('');
  const [showAllCuisines, setShowAllCuisines] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [filters, setFilters] = useState({
    cuisineType: '',
    isOpen: '',
    minRating: '',
    price: '',
  });

  const { selectedAddress, setIsLocationModalOpen } = useAddressStore();
  const query = useSearchParams();
  const searchQuery = query.get('search') || '';

  const allCuisines = ['Italian', 'Chinese', 'Mexican', 'Indian', 'Japanese', 'Thai', 'American', 'Mediterranean', 'Vietnamese', 'Korean', 'French', 'Spanish', 'Greek', 'Turkish', 'Brazilian'];
  const filteredCuisines = allCuisines.filter(cuisine =>
    cuisine.toLowerCase().includes(cuisineSearchTerm.toLowerCase())
  );

  useEffect(() => {
    const checkAuthAndRedirect = () => {
      try {
        const token = localStorage.getItem('token');
        const user = auth.getCurrentUser();
        
        console.log('🔵 Home page auth check - token:', !!token, 'user:', !!user);
        
        // ✅ Only redirect if user is NOT a customer
        if (token && user) {
          // ✅ Don't redirect customers - they stay on home page
          if (user.role !== 'customer') {
            console.log('🔵 Redirecting non-customer user to:', user.role);
            switch (user.role) {
              case 'admin':
                router.replace('/admin/dashboard');
                return;
              case 'owner':
                router.replace('/owner/dashboard');
                return;
              case 'agent':
                router.replace('/agent/dashboard');
                return;
              default:
                break;
            }
          } else {
            console.log('🔵 Customer user - staying on home page');
          }
        } else {
          console.log('🔵 No user found - showing home page');
        }
        setIsCheckingAuth(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        setIsCheckingAuth(false);
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  useEffect(() => {
    if (!isCheckingAuth) {
      fetchRestaurants();
    }
  }, [isCheckingAuth]);

  useEffect(() => {
    if (!isCheckingAuth) {
      applyFiltersAndSort();
    }
  }, [restaurants, searchQuery, filters, sortBy, isCheckingAuth]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await api.get('/restaurants');
      const restaurantData = response.data || [];
      const restaurantsArray = Array.isArray(restaurantData) 
        ? restaurantData 
        : (restaurantData.data || restaurantData.items || []);
      setRestaurants(restaurantsArray);
      setFilteredRestaurants(restaurantsArray);
    } catch (error) {
      console.error('Failed to load restaurants:', error);
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...restaurants];

    if (searchQuery) {
      filtered = filtered.filter(
        (r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.cuisineType.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filters.cuisineType) {
      filtered = filtered.filter((r) => r.cuisineType === filters.cuisineType);
    }

    if (filters.isOpen === 'open') {
      filtered = filtered.filter((r) => r.isOpen === true);
    }

    if (filters.minRating) {
      filtered = filtered.filter((r) => (r.rating || 0) >= parseFloat(filters.minRating));
    }

    switch (sortBy) {
      case 'rating':
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      default:
        break;
    }

    setFilteredRestaurants(filtered);
  };

  const clearFilters = () => {
    setFilters({ cuisineType: '', isOpen: '', minRating: '', price: '' });
    setSortBy('relevance');
    setShowAllCuisines(false);
    setCuisineSearchTerm('');
  };

  const activeFilterCount = [filters.cuisineType, filters.isOpen, filters.minRating, filters.price].filter(Boolean).length;

  if (isCheckingAuth) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6 items-start">
          {/* Left Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0 sticky top-40 self-start">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-white z-10">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-gray-600" />
                  <h2 className="font-semibold text-gray-800">Filters</h2>
                  {activeFilterCount > 0 && (
                    <span className="bg-orange-500 text-white text-xs rounded-full px-2 py-0.5">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                {activeFilterCount > 0 && (
                  <button onClick={clearFilters} className="text-sm text-orange-500 hover:text-orange-600">
                    Clear all
                  </button>
                )}
              </div>

              <div className="max-h-[calc(100vh-240px)] overflow-y-auto overflow-x-hidden p-5 space-y-6">
                {/* Sort By */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Sort by</h3>
                  <div className="space-y-2">
                    {[
                      { value: 'relevance', label: 'Relevance' },
                      { value: 'rating', label: 'Top rated' },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="sort"
                          value={option.value}
                          checked={sortBy === option.value}
                          onChange={(e) => setSortBy(e.target.value)}
                          className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price Filter */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Price</h3>
                  <div className="flex gap-2">
                    {['$', '$$', '$$$'].map((price) => (
                      <button
                        key={price}
                        onClick={() => setFilters({ ...filters, price: filters.price === price ? '' : price })}
                        className={`px-5 py-2 rounded-full text-sm font-medium transition border ${
                          filters.price === price
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        {price}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Filters */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Quick filters</h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilters({ ...filters, isOpen: filters.isOpen === 'open' ? '' : 'open' })}
                      className={`px-3 py-1.5 rounded-full text-sm transition border ${
                        filters.isOpen === 'open'
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      <Clock className="w-3 h-3 inline mr-1" />
                      Open now
                    </button>
                  </div>
                </div>

                {/* Cuisines */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-gray-800">Cuisines</h3>
                  </div>
                  
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search cuisine..."
                      value={cuisineSearchTerm}
                      onChange={(e) => setCuisineSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm text-gray-800 placeholder-gray-400 rounded-lg border border-gray-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
                    />
                  </div>

                  <div className="space-y-2">
                    {filteredCuisines.slice(0, showAllCuisines ? undefined : 6).map((cuisine) => (
                      <label key={cuisine} className="flex items-center gap-3 cursor-pointer py-1 hover:bg-gray-50 rounded px-1 transition">
                        <input
                          type="checkbox"
                          checked={filters.cuisineType === cuisine}
                          onChange={() => setFilters({ ...filters, cuisineType: filters.cuisineType === cuisine ? '' : cuisine })}
                          className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                        />
                        <span className="text-sm text-gray-700">{cuisine}</span>
                      </label>
                    ))}
                  </div>
                  
                  {filteredCuisines.length > 6 && !showAllCuisines && (
                    <button
                      onClick={() => setShowAllCuisines(true)}
                      className="mt-3 flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 font-medium"
                    >
                      <ChevronDown className="w-4 h-4" />
                      See more ({filteredCuisines.length - 6} more)
                    </button>
                  )}
                  
                  {showAllCuisines && filteredCuisines.length > 6 && (
                    <button
                      onClick={() => setShowAllCuisines(false)}
                      className="mt-3 flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 font-medium"
                    >
                      <ChevronUp className="w-4 h-4" />
                      See less
                    </button>
                  )}
                </div>

                {/* Rating Filter */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Rating</h3>
                  <div className="space-y-2">
                    {[
                      { value: '4.5', label: '4.5+ stars' },
                      { value: '4.0', label: '4.0+ stars' },
                      { value: '3.5', label: '3.5+ stars' },
                      { value: '3.0', label: '3.0+ stars' },
                    ].map((option) => (
                      <label key={option.value} className="flex items-center gap-3 cursor-pointer py-1 hover:bg-gray-50 rounded px-1 transition">
                        <input
                          type="radio"
                          name="rating-filter"
                          value={option.value}
                          checked={filters.minRating === option.value}
                          onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
                          className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                        />
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-700">{option.label}</span>
                          <div className="flex ml-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-3.5 h-3.5 ${i < Math.floor(parseFloat(option.value)) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} 
                              />
                            ))}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Mobile Filter Button */}
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="lg:hidden fixed bottom-4 right-4 bg-orange-500 text-white p-3 rounded-full shadow-lg z-50"
          >
            <Filter className="w-5 h-5" />
          </button>

          {/* Mobile Filter Sidebar */}
          {isFilterOpen && (
            <div className="lg:hidden fixed inset-0 bg-black/50 z-50" onClick={() => setIsFilterOpen(false)}>
              <div className="absolute right-0 top-0 h-full w-80 bg-white shadow-xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-gray-600" />
                    <h2 className="font-semibold text-gray-800">Filters</h2>
                  </div>
                  <button onClick={() => setIsFilterOpen(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="p-4 space-y-6">
                  {/* Sort By */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Sort by</h3>
                    <div className="space-y-2">
                      {[
                        { value: 'relevance', label: 'Relevance' },
                        { value: 'rating', label: 'Top rated' },
                      ].map((option) => (
                        <label key={option.value} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="sort-mobile"
                            value={option.value}
                            checked={sortBy === option.value}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                          />
                          <span className="text-sm text-gray-700">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Price Filter */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Price</h3>
                    <div className="flex gap-2">
                      {['$', '$$', '$$$'].map((price) => (
                        <button
                          key={price}
                          onClick={() => setFilters({ ...filters, price: filters.price === price ? '' : price })}
                          className={`px-4 py-2 rounded-full text-sm font-medium transition border ${
                            filters.price === price
                              ? 'bg-orange-500 text-white border-orange-500'
                              : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                          }`}
                        >
                          {price}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quick Filters */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Quick filters</h3>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setFilters({ ...filters, isOpen: filters.isOpen === 'open' ? '' : 'open' })}
                        className={`px-3 py-1.5 rounded-full text-sm transition border ${
                          filters.isOpen === 'open'
                            ? 'bg-orange-500 text-white border-orange-500'
                            : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        <Clock className="w-3 h-3 inline mr-1" />
                        Open now
                      </button>
                    </div>
                  </div>

                  {/* Cuisines */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Cuisines</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {allCuisines.map((cuisine) => (
                        <label key={cuisine} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filters.cuisineType === cuisine}
                            onChange={() => setFilters({ ...filters, cuisineType: filters.cuisineType === cuisine ? '' : cuisine })}
                            className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                          />
                          <span className="text-sm text-gray-700">{cuisine}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Rating */}
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-3">Rating</h3>
                    <div className="space-y-2">
                      {['4.5', '4.0', '3.5', '3.0'].map((rating) => (
                        <label key={rating} className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="radio"
                            name="rating-mobile"
                            value={rating}
                            checked={filters.minRating === rating}
                            onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
                            className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                          />
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-700">{rating}+ stars</span>
                            <div className="flex">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < Math.floor(parseFloat(rating)) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                              ))}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={clearFilters}
                      className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200"
                    >
                      Clear all filters
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <main className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-800">All Restaurants</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {filteredRestaurants.length} restaurants found
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white rounded-xl shadow-sm overflow-hidden animate-pulse">
                    <div className="h-40 bg-gray-200"></div>
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-full"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredRestaurants.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm">
                <div className="text-6xl mb-4">🔍</div>
                <h2 className="text-xl font-semibold text-gray-800 mb-2">No restaurants found</h2>
                <p className="text-gray-500">Try adjusting your filters or change your location</p>
                <button onClick={clearFilters} className="mt-4 text-orange-500 hover:underline">
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
                {Array.isArray(filteredRestaurants) && filteredRestaurants.map((restaurant) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} />
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  );
}