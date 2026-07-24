'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import {
  LayoutDashboard,
  Store,
  Package,
  Menu,
  BarChart3,
  Menu as MenuIcon,
  X,
} from 'lucide-react';

// Navigation ONLY - the logo, portal title, notifications, profile menu and
// logout all live in the global Navbar's "dashboard" bar (Navbar.tsx,
// isDashboardPage branch) — this sidebar used to duplicate that branding
// with its own logo header + bottom user-avatar block, which is why it's
// gone from here now. Keeping it in exactly one place.
const navItems = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, path: '/owner/dashboard' },
  { id: 'restaurants', label: 'My Restaurants', icon: Store, path: '/owner/restaurants' },
  { id: 'menu', label: 'Menu Management', icon: Menu, path: '/owner/menu' },
  { id: 'orders', label: 'Orders', icon: Package, path: '/owner/orders' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/owner/analytics' },
];

// Height of the global dashboard Navbar (Navbar.tsx uses h-20 = 5rem in its
// isDashboardPage branch). The sidebar and its mobile toggle are offset by
// this so they sit below it instead of overlapping it.
const NAVBAR_HEIGHT = '5rem';

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const currentUser = auth.getCurrentUser();
    if (!currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser.role !== 'owner') {
      router.push('/');
      return;
    }

    setUser(currentUser);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Toggle — offset below the Navbar instead of top-4,
          which used to sit inside the Navbar's own header band */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{ top: `calc(${NAVBAR_HEIGHT} + 1rem)` }}
        className="lg:hidden fixed left-4 z-40 p-2.5 bg-white rounded-xl shadow-md shadow-black/5 border border-gray-100 active:scale-95 transition-transform"
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
      >
        {sidebarOpen ? <X className="w-5 h-5 text-gray-700" /> : <MenuIcon className="w-5 h-5 text-gray-700" />}
      </button>

      {/* Sidebar - Navigation ONLY (NO settings, NO logout). Starts below the
          global Navbar (top: NAVBAR_HEIGHT, not top-0) so it no longer
          overlaps it. */}
      <aside
        style={{ top: NAVBAR_HEIGHT, height: `calc(100vh - ${NAVBAR_HEIGHT})` }}
        className={`fixed left-0 bg-white border-r border-gray-100 z-30 transition-[width] duration-300 ease-out flex flex-col ${
          sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
        } overflow-hidden`}
      >
        <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
          {sidebarOpen && (
            <p className="px-3 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
              Menu
            </p>
          )}
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.id}
                href={item.path}
                className={`group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r-full bg-orange-500" />
                )}
                <span
                  className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 transition-colors ${
                    isActive ? 'bg-orange-500 text-white shadow-sm shadow-orange-200' : 'bg-gray-100 text-gray-500 group-hover:bg-white group-hover:text-gray-700'
                  }`}
                >
                  <item.icon className="w-4.5 h-4.5" />
                </span>
                {sidebarOpen && (
                  <span className="flex-1 text-left text-sm font-medium truncate">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-[margin] duration-300 ease-out min-h-screen ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        }`}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}