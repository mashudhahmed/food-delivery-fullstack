'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, User, ShoppingBag, Globe, ArrowLeft, Lock } from 'lucide-react';
import { auth } from '@/app/lib/api';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function RestaurantNavbar() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    const authenticated = auth.isAuthenticated();
    setIsAuthenticated(authenticated);
    if (authenticated) {
      setUser(auth.getCurrentUser());
    }
    // Get cart count from localStorage
    const cart = localStorage.getItem('cart-storage');
    if (cart) {
      try {
        const parsed = JSON.parse(cart);
        const items = parsed?.state?.items || [];
        const count = items.reduce((sum: number, item: any) => sum + item.quantity, 0);
        setCartItemsCount(count);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleCartClick = () => {
    if (!isAuthenticated) {
      // Show toast notification prompting login
      toast.error('Please log in to view your cart', {
        duration: 3000,
        position: 'top-center',
        icon: '🔒',
      });
      // Optional: redirect to login after 1 second
      setTimeout(() => {
        router.push('/login');
      }, 1500);
      return;
    }
    router.push('/cart');
  };

  const handleLoginClick = () => {
    router.push('/login');
  };

  const handleSignupClick = () => {
    router.push('/register');
  };

  return (
    <div className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo with Back Button */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 rounded-full transition lg:hidden"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <Link href="/" className="shrink-0">
              <div className="flex items-center gap-2">
                <Image 
                  src="/logo.png" 
                  alt="QuickBite Logo" 
                  width={32} 
                  height={32}
                  className="w-8 h-8 object-contain"
                />
                <span className="text-xl font-bold text-orange-500 hidden sm:block">QuickBite</span>
              </div>
            </Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Cart Icon - Industry Standard */}
            <div className="relative">
              <button 
                onClick={handleCartClick}
                disabled={!isAuthenticated}
                className={`relative p-2 rounded-full transition cursor-pointer ${
                  isAuthenticated 
                    ? 'hover:bg-gray-100 cursor-pointer' 
                    : 'cursor-not-allowed opacity-50'
                }`}
                aria-label={isAuthenticated ? "View cart" : "Login to view cart"}
              >
                <ShoppingBag className="w-5 h-5 text-gray-600" />
                {isAuthenticated && cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
                {/* Lock icon overlay for unauthenticated users */}
                {!isAuthenticated && (
                  <div className="absolute -top-1 -right-1 bg-gray-400 rounded-full w-5 h-5 flex items-center justify-center">
                    <Lock className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
              {/* Tooltip on hover for unauthenticated users */}
              {!isAuthenticated && (
                <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                  Login to view cart
                </div>
              )}
            </div>

            {/* Auth Buttons - Industry Standard */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-sm font-medium hidden sm:inline text-gray-700">
                  {user?.fullName?.split(' ')[0] || 'User'}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleLoginClick}
                  className="text-sm font-medium text-orange-600 hover:text-orange-700 transition px-3 py-1.5"
                >
                  Log in
                </button>
                <button
                  onClick={handleSignupClick}
                  className="bg-orange-500 text-white px-4 py-1.5 rounded-full text-sm font-semibold hover:bg-orange-600 transition shadow-sm"
                >
                  Sign up
                </button>
              </div>
            )}

            {/* Language Selector */}
            <button className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-600 px-2 py-2 rounded-full hover:bg-gray-100 transition">
              <Globe className="w-4 h-4" />
              EN
              <ChevronDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}