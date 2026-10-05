import Link from 'next/link';
import { Home, UtensilsCrossed, Package, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center bg-gray-50 px-4 py-16">
      <div className="max-w-lg w-full text-center">
        <div className="relative inline-block mb-6">
          <span className="text-8xl font-black text-orange-500/20 select-none">404</span>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-16 h-16 rounded-3xl bg-orange-50 border border-orange-100 flex items-center justify-center text-3xl shadow-sm">
              🍔
            </span>
          </div>
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
          Page Not Found
        </h1>
        <p className="text-gray-500 text-sm max-w-sm mx-auto mb-8 leading-relaxed">
          The page or restaurant you're looking for doesn't exist, may have been removed, or has changed address.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold shadow-md shadow-orange-500/20 transition active:scale-95"
          >
            <UtensilsCrossed className="w-4 h-4" />
            Explore Restaurants
          </Link>
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-xl text-sm font-semibold transition shadow-xs"
          >
            <Package className="w-4 h-4" />
            My Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
