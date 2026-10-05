'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { unwrapPaginated } from '@/lib/unwrapPaginated';
import MenuItemCard from '@/components/MenuItemCard';
import LoadingSkeleton from '@/components/LoadingSkeleton';
import toast from 'react-hot-toast';
import { ArrowLeft, MapPin, Star, Clock, MessageSquare, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { MenuItem } from '@/types';

export default function RestaurantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [restaurant, setRestaurant] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'menu' | 'reviews'>('menu');
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function fetchRestaurantData() {
      try {
        setLoading(true);
        const [restRes, menuRes, reviewsRes] = await Promise.allSettled([
          api.get(`/restaurants/${id}`),
          api.get(`/menu/restaurant/${id}`),
          api.get(`/reviews/restaurant/${id}`),
        ]);

        if (cancelled) return;

        if (restRes.status === 'fulfilled') {
          setRestaurant(restRes.value.data?.data || restRes.value.data);
        } else {
          toast.error('Failed to load restaurant');
          router.push('/');
          return;
        }

        if (menuRes.status === 'fulfilled') {
          const menuData = unwrapPaginated(menuRes.value.data).items as MenuItem[];
          setMenuItems(menuData);
        }

        if (reviewsRes.status === 'fulfilled') {
          const revData = reviewsRes.value.data?.data || reviewsRes.value.data?.items || reviewsRes.value.data || [];
          setReviews(Array.isArray(revData) ? revData : []);
        }
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          toast.error('Failed to load restaurant');
          router.push('/');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchRestaurantData();

    return () => {
      cancelled = true;
    };
  }, [id, router]);

  useEffect(() => {
    if (restaurant?.name) {
      document.title = `${restaurant.name} - Menu & Reviews | QuickBite`;
    }
  }, [restaurant?.name]);

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

      {/* Tab Switcher */}
      <div className="px-4 sm:px-6 mt-6 border-b border-gray-200">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('menu')}
            className={`pb-3 font-semibold text-sm transition relative ${
              activeTab === 'menu'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Menu ({menuItems.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`pb-3 font-semibold text-sm transition flex items-center gap-1.5 relative ${
              activeTab === 'reviews'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Reviews ({reviews.length})
          </button>
        </div>
      </div>

      {activeTab === 'menu' ? (
        <>
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
            <h2 className="text-lg font-semibold mb-4">Menu Items ({filteredItems.length})</h2>

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
        </>
      ) : (
        /* Reviews Tab Content */
        <div className="px-4 sm:px-6 mt-6 space-y-6">
          <div className="bg-orange-50/50 rounded-2xl p-6 border border-orange-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-extrabold text-gray-900">
                  {restaurant.rating != null ? Number(restaurant.rating).toFixed(1) : 'New'}
                </span>
                <div className="flex text-amber-400">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(restaurant.rating || 0)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Based on {reviews.length} customer review{reviews.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-600">No customer reviews yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Order from this restaurant to be the first to leave a review!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((rev: any) => (
                <div
                  key={rev.id}
                  className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm overflow-hidden">
                        {rev.customer?.profilePicture ? (
                          <Image
                            src={rev.customer.profilePicture}
                            alt={rev.customer?.fullName || 'Customer'}
                            width={40}
                            height={40}
                            className="object-cover w-full h-full"
                            unoptimized
                          />
                        ) : (
                          <UserIcon className="w-5 h-5" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-gray-900">
                          {rev.customer?.fullName || 'Verified Customer'}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(rev.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            star <= rev.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {rev.comment && (
                    <p className="text-sm text-gray-700 leading-relaxed">{rev.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}