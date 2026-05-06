'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, ChevronDown, User, Search, X, Globe, ShoppingBag } from 'lucide-react';
import { auth } from '@/app/lib/api';
import Image from 'next/image';

export default function HomeNavbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deliveryType, setDeliveryType] = useState('delivery');

  useEffect(() => {
    setUser(auth.getCurrentUser());
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/?search=${encodeURIComponent(searchTerm)}`);
    }
  };

  return (
    <>
      {/* Top Header Row - QuickBite */}
      <div className="bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo - Left */}
            <Link href="/" className="shrink-0">
              <div className="flex items-center gap-0">
                <Image 
                  src="/logo.png" 
                  alt="QuickBite Logo" 
                  width={32} 
                  height={32}
                  className="w-20 h-20 object-contain"
                />
                <span className="text-2xl font-bold text-orange-500">QuickBite</span>
              </div>
            </Link>

            {/* Address Selector - Center */}
            <div className="hidden lg:flex items-center gap-2 bg-gray-100 px-4 py-2.5 rounded-full cursor-pointer hover:bg-gray-200 transition border border-gray-200">
              <MapPin className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-medium text-gray-700">New address</span>
              <span className="text-sm text-gray-500">Select your address</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              {/* Cart Icon - Non-clickable for unauthenticated users */}
              {user ? (
                <Link href="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition cursor-pointer">
                  <ShoppingBag className="w-5 h-5 text-gray-600" />
                </Link>
              ) : (
                <div className="relative p-2 rounded-full cursor-not-allowed opacity-50">
                  <ShoppingBag className="w-5 h-5 text-gray-400" />
                </div>
              )}

              {/* Auth Buttons */}
              {user ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Hi, {user.fullName?.split(' ')[0]}</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-orange-500">
                    Log in
                  </Link>
                  <Link
                    href="/register"
                    className="bg-orange-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-orange-600 transition"
                  >
                    Sign up for free delivery
                  </Link>
                </div>
              )}

              {/* Language Selector with Globe Icon */}
              <button className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-600 px-3 py-2 rounded-full hover:bg-gray-100 transition">
                <Globe className="w-4 h-4" />
                EN
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Second Row - Delivery/Pickup + Full Width Search Bar (No border line) */}
      <div className="bg-white shadow-sm sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 py-3">
            {/* Left side - Delivery/Pickup Toggle */}
            <div className="flex gap-1 bg-gray-100 rounded-full p-1 shrink-0">
              <button
                onClick={() => setDeliveryType('delivery')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                  deliveryType === 'delivery'
                    ? 'bg-white text-orange-500 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Delivery
              </button>
              <button
                onClick={() => setDeliveryType('pickup')}
                className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                  deliveryType === 'pickup'
                    ? 'bg-white text-orange-500 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Pick-up
              </button>
            </div>

            {/* Full Width Search Bar */}
            <div className="flex-1 w-full">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search for restaurants, cuisines, and dishes"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-2.5 text-gray-800 placeholder-gray-400 rounded-full border border-gray-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-gray-50 hover:bg-white transition"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                )}
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="md:hidden bg-white">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search for restaurants, cuisines, and dishes"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 text-gray-800 placeholder-gray-400 rounded-full border border-gray-200 focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 bg-gray-50"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-4 top-1/2 transform -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Mobile Delivery/Pickup Toggle */}
      <div className="md:hidden bg-white pb-3">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-center">
            <div className="flex gap-1 bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setDeliveryType('delivery')}
                className={`px-5 py-1.5 rounded-full text-sm font-medium transition ${
                  deliveryType === 'delivery'
                    ? 'bg-white text-orange-500 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Delivery
              </button>
              <button
                onClick={() => setDeliveryType('pickup')}
                className={`px-5 py-1.5 rounded-full text-sm font-medium transition ${
                  deliveryType === 'pickup'
                    ? 'bg-white text-orange-500 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Pick-up
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}