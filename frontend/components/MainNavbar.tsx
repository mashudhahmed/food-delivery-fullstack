'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { MapPin, ChevronDown, User, Heart, ShoppingBag, Menu, X, Lock } from 'lucide-react';
import { auth } from '@/app/lib/api';
import { useCartStore } from '@/app/stores/cartStore';
import toast from 'react-hot-toast';

export default function MainNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const cartItemsCount = useCartStore((state: { getTotalItems: () => any; }) => state.getTotalItems());

  useEffect(() => {
    const authenticated = auth.isAuthenticated();
    setIsAuthenticated(authenticated);
    if (authenticated) {
      setUser(auth.getCurrentUser());
    }
  }, [pathname]);

  const handleLogout = () => {
    auth.logout();
    setUser(null);
    setIsAuthenticated(false);
    router.push('/login');
  };

  const handleCartClick = () => {
    if (!isAuthenticated) {
      toast.error('Please log in to view your cart', {
        duration: 3000,
        position: 'top-center',
      });
      setTimeout(() => router.push('/login'), 1500);
      return;
    }
    router.push('/cart');
  };

  // Don't show this navbar on homepage
  if (pathname === '/') return null;

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="shrink-0">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="QuickBite Logo" className="w-8 h-8 object-contain" />
              <span className="text-xl font-bold text-orange-500 hidden sm:block">QuickBite</span>
            </div>
          </Link>

          {/* Navigation Links - Only for logged in users */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-6">
              <Link href="/orders" className="text-sm font-medium text-gray-700 hover:text-orange-500">
                Orders
              </Link>
              <Link href="/favorites" className="text-sm font-medium text-gray-700 hover:text-orange-500">
                Favorites
              </Link>
            </div>
          )}

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            {/* Cart Icon - Conditional */}
            <div className="relative">
              <button
                onClick={handleCartClick}
                disabled={!isAuthenticated}
                className={`relative p-2 rounded-full transition ${
                  isAuthenticated ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-not-allowed opacity-50'
                }`}
              >
                <ShoppingBag className="w-5 h-5 text-gray-600" />
                {isAuthenticated && cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
                {!isAuthenticated && (
                  <div className="absolute -top-1 -right-1 bg-gray-400 rounded-full w-5 h-5 flex items-center justify-center">
                    <Lock className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            </div>

            {/* Auth Section */}
            {isAuthenticated ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-sm font-medium hidden sm:inline">{user?.fullName?.split(' ')[0]}</span>
                <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-600">
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-orange-500">
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-orange-600 transition"
                >
                  Sign up
                </Link>
              </div>
            )}

            <button className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-600">
              EN
              <ChevronDown className="w-4 h-4" />
            </button>

            <button className="md:hidden p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}