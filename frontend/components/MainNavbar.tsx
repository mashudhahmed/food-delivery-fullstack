'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { MapPin, ChevronDown, User, Heart, ShoppingBag, Menu, X } from 'lucide-react';
import { auth } from '@/app/lib/api';
import { useCartStore } from '@/app/stores/cartStore';

export default function MainNavbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const cartItemsCount = useCartStore((state: { getTotalItems: () => any; }) => state.getTotalItems());

  useEffect(() => {
    setUser(auth.getCurrentUser());
  }, [pathname]);

  const handleLogout = () => {
    auth.logout();
    setUser(null);
    router.push('/login');
  };

  // Don't show this navbar on homepage
  if (pathname === '/') return null;

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="shrink-0">
            <span className="text-2xl font-bold text-orange-500">QuickBite</span>
          </Link>

          {/* Navigation Links - Only for logged in users */}
          {user && (
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
            {/* Cart Icon - Only for logged in users */}
            {user && (
              <Link href="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition">
                <ShoppingBag className="w-5 h-5 text-gray-600" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </Link>
            )}

            {/* Auth Section */}
            {user ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-sm font-medium hidden sm:inline">{user.fullName?.split(' ')[0]}</span>
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
                  className="bg-orange-500 text-white px-5 py-2 rounded-full text-sm font-semibold hover:bg-orange-600 transition"
                >
                  Sign up for free delivery
                </Link>
              </div>
            )}

            {/* Language Selector */}
            <button className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-600">
              EN
              <ChevronDown className="w-4 h-4" />
            </button>

            {/* Mobile menu button */}
            <button className="md:hidden p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-white z-40 overflow-auto">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Link
                href="/orders"
                className="block px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Orders
              </Link>
              <Link
                href="/favorites"
                className="block px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Favorites
              </Link>
              <Link
                href="/cart"
                className="block px-4 py-3 rounded-xl text-gray-700 hover:bg-gray-50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Cart ({cartItemsCount})
              </Link>
            </div>

            {!user && (
              <div className="pt-4 space-y-3 border-t border-gray-100">
                <Link
                  href="/login"
                  className="block w-full text-center px-4 py-3 border border-orange-500 text-orange-600 rounded-xl font-semibold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/register"
                  className="block w-full text-center px-4 py-3 bg-orange-500 text-white rounded-xl font-semibold"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}