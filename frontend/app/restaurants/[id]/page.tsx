'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useCartStore } from '@/stores/cartStore';
import { unwrapPaginated } from '@/lib/unwrapPaginated';
import MenuItemCard from '@/components/MenuItemCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import toast from 'react-hot-toast';
import { ArrowLeft, MapPin, Star, Clock } from 'lucide-react';
import Link from 'next/link';
import { MenuItem } from '@/types';

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  const { items, clearCart } = useCartStore();

  // Clear cart when switching restaurants
  useEffect(() => {
    if (!id) return;
    const cartRestaurantId = items[0]?.restaurantId;
    if (cartRestaurantId && cartRestaurantId !== id) {
      clearCart();
      toast('Cart cleared because you switched restaurants', { icon: '🛒' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (id) fetchRestaurantAndMenu();
  }, [id]);

  async function fetchRestaurantAndMenu() {
    try {
      setLoading(true);
      const [restRes, menuRes] = await Promise.all([
        api.get(`/restaurants/${id}`),
        api.get(`/menu/restaurant/${id}`),
      ]);

      const restaurantData = restRes.data?.data || restRes.data;
      const menuData = unwrapPaginated(menuRes.data).items as MenuItem[];

      setRestaurant(restaurantData);
      setMenuItems(menuData);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load restaurant');
      router.push('/');
    } finally {
      setLoading(false);
    }
  }

  const categories = [
    'All',
    ...Array.from(new Set(menuItems.map((item) => item.category).filter(Boolean))),
  ];

  const filteredItems =
    activeCategory === 'All'
      ? menuItems
      : menuItems.filter((item) => item.category === activeCategory);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <LoadingSkeleton />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="max-w-5xl mx-auto p-6 text-center py-20">
        <p className="text-gray-500 mb-4">Restaurant not found</p>
        <Link href="/" className="text-orange-600 hover:underline">
          Back to home
        </Link>
      </div>
    );
  }

  const isClosed = restaurant.isOpen === false;

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="relative h-48 sm:h-64 bg-gray-200">
        {restaurant.imageUrl || restaurant.coverImage || restaurant.image ? (
          <img
            src={restaurant.imageUrl || restaurant.coverImage || restaurant.image}
            alt={restaurant.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-linear-to-br from-orange-400 to-orange-600" />
        )}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 p-2 bg-white/90 rounded-full shadow hover:bg-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 sm:px-6 -mt-8 relative z-10">
        <div className="bg-white rounded-2xl shadow-md p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{restaurant.name}</h1>
              <p className="text-sm text-gray-600 mt-1">
                {restaurant.cuisineType || restaurant.cuisine || restaurant.category || 'Restaurant'}
              </p>
            </div>
            {restaurant.rating != null && (
              <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-1 rounded-lg text-sm font-medium">
                <Star className="w-4 h-4 fill-current" />
                {Number(restaurant.rating).toFixed(1)}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-600">
            {restaurant.address && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                <span className="line-clamp-1">{restaurant.address}</span>
              </div>
            )}
            {(restaurant.deliveryTime || restaurant.estimatedDeliveryTime) && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{restaurant.deliveryTime || restaurant.estimatedDeliveryTime} min</span>
              </div>
            )}
          </div>

          {restaurant.description && (
            <p className="mt-3 text-sm text-gray-600 line-clamp-2">{restaurant.description}</p>
          )}

          {isClosed && (
            <p className="mt-3 text-sm font-medium text-amber-600">
              This restaurant is currently closed
            </p>
          )}
        </div>
      </div>

      {categories.length > 1 && (
        <div className="px-4 sm:px-6 mt-6 overflow-x-auto">
          <div className="flex gap-2 pb-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  activeCategory === cat
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="px-4 sm:px-6 mt-6">
        <h2 className="text-lg font-semibold mb-4">Menu ({filteredItems.length})</h2>

        {filteredItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No items in this category</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                restaurantName={restaurant.name}
                restaurantId={restaurant.id}
                disabled={isClosed}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}