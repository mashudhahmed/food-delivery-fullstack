'use client';

import Link from 'next/link';
import { useCartStore } from '@/app/stores/cartStore';
import { auth } from '@/app/lib/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navbar() {
  const { getTotalItems } = useCartStore();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    setIsAuthenticated(auth.isAuthenticated());
    setUser(auth.getCurrentUser());
  }, []);

  const handleLogout = () => {
    auth.logout();
    router.push('/login');
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="text-2xl font-bold text-orange-600">
            QuickBite 🍔
          </Link>

          <div className="flex items-center gap-6">
            <Link href="/" className="text-gray-700 hover:text-orange-600">
              Restaurants
            </Link>

            <Link href="/cart" className="relative">
              <span className="text-gray-700 hover:text-orange-600">🛒</span>
              {getTotalItems() > 0 && (
                <span className="absolute -top-2 -right-3 bg-orange-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </Link>

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  Hi, {user?.fullName?.split(' ')[0]}
                </span>
                <Link href="/orders" className="text-gray-700 hover:text-orange-600">
                  Orders
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Link
                  href="/login"
                  className="text-orange-600 border border-orange-600 px-3 py-1 rounded-md hover:bg-orange-50"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-orange-600 text-white px-3 py-1 rounded-md hover:bg-orange-700"
                >
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}