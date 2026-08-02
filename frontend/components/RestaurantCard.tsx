"use client";

import Link from "next/link";
import Image from "next/image";
import { Star, Heart } from "lucide-react";
import { useFavoritesStore } from "@/stores/favoritesStore";
import { auth } from "@/lib/auth";
import { toast } from "sonner"; // or "react-hot-toast" if you prefer

interface RestaurantCardProps {
  restaurant: {
    id: string;
    name: string;
    description?: string;
    image?: string;
    imageUrl?: string;
    rating?: number;
    reviewCount?: number;
    isOpen?: boolean;
    cuisineType?: string;
    deliveryFee?: number;
    deliveryTime?: string;
  };
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
  const { items, toggleFavorite } = useFavoritesStore();
  const isFavorite = items.some((i) => i.id === restaurant.id);
  const isClosed = restaurant.isOpen === false;

  const imageSrc = restaurant.imageUrl || restaurant.image || null;

  const handleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // ✅ Not logged in → prompt to log in, do NOT toggle
    if (!auth.isAuthenticated()) {
      toast.error("Please log in to add favorites", {
        description: "Sign in to save restaurants you love.",
        action: {
          label: "Log in",
          onClick: () => {
            // Dispatch a custom event that Navbar listens to, or open AuthModal
            window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { mode: "login" } }));
          },
        },
      });
      return;
    }

    toggleFavorite({
      id: restaurant.id,
      name: restaurant.name,
      image: imageSrc || undefined,
      rating: restaurant.rating,
    });

    toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
  };

  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="group block bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
    >
      {/* Image */}
      <div className="relative aspect-16/10 bg-slate-100 overflow-hidden">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={restaurant.name}
            fill
            className="object-cover group-hover:scale-105 transition duration-500"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-orange-100 to-orange-50">
            <span className="text-4xl font-bold text-orange-300">
              {restaurant.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Favorite button */}
        <button
          onClick={handleFavorite}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:scale-110 transition z-10"
          aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className={`w-4 h-4 transition ${
              isFavorite ? "fill-red-500 text-red-500" : "text-slate-600"
            }`}
          />
        </button>

        {/* Closed badge */}
        {isClosed && (
          <div className="absolute top-3 left-3 z-10">
            <span className="px-2.5 py-1 rounded-full bg-slate-900/80 text-white text-xs font-semibold backdrop-blur">
              Closed
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 group-hover:text-orange-600 transition line-clamp-1">
          {restaurant.name}
        </h3>

        {restaurant.description && (
          <p className="text-sm text-slate-500 mt-1 line-clamp-1">
            {restaurant.description}
          </p>
        )}

        <div className="flex items-center gap-3 mt-3 text-sm text-slate-600">
          {restaurant.rating !== undefined && Number(restaurant.rating) > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-medium">
                {Number(restaurant.rating).toFixed(1)}
              </span>
              {restaurant.reviewCount !== undefined && (
                <span className="text-slate-400 text-xs">
                  ({restaurant.reviewCount})
                </span>
              )}
            </div>
          )}

          {restaurant.cuisineType && (
            <span className="text-slate-400 text-xs">{restaurant.cuisineType}</span>
          )}
        </div>
      </div>
    </Link>
  );
}