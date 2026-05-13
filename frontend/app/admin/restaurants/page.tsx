'use client';
import { useEffect, useState } from 'react';
import { api } from '@/app/lib/api';
import { Star } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RestaurantsPage() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const response = await api.get('/admin/restaurants');
      setRestaurants(response.data);
    } catch (error) {
      toast.error('Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div></div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Restaurants</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurants.map((restaurant: any) => (
          <div key={restaurant.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">{restaurant.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{restaurant.address}</p>
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm">{restaurant.rating || 'New'}</span>
                </div>
                <p className="text-xs text-gray-400 mt-2">Owner: {restaurant.ownerName}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${restaurant.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {restaurant.isOpen ? 'Open' : 'Closed'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}