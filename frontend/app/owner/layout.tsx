'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/lib/auth';
import { 
  LayoutDashboard, 
  Store, 
  Package, 
  Menu,
  BarChart3,
  Settings,
  Shield,
  Menu as MenuIcon,
  X,
  Users,
  TrendingUp,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

// Navigation ONLY for Owner - NO settings, NO logout in sidebar
const navItems = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, path: '/owner/dashboard' },
  { id: 'restaurants', label: 'My Restaurants', icon: Store, path: '/owner/restaurants' },
  { id: 'menu', label: 'Menu Management', icon: Menu, path: '/owner/menu' },
  { id: 'orders', label: 'Orders', icon: Package, path: '/owner/orders' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, path: '/owner/analytics' },
];

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
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
      </button>

      {/* Sidebar - Navigation ONLY (NO settings, NO logout) */}
      <aside className={`fixed top-0 left-0 h-full bg-white shadow-xl z-40 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 lg:w-20'} overflow-hidden`}>
        {/* Sidebar Header: Logo + Brand */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {/* QuickBite Logo */}
            <div className="shrink-0">
              <Image 
                src="/logo.png" 
                alt="QuickBite" 
                width={40} 
                height={40} 
                className="w-10 h-10 object-contain"
                priority
              />
            </div>
            {sidebarOpen && (
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-800 text-xl">QuickBite</span>
                  <Store className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-xs text-gray-500 mt-0.5">Owner Portal</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Links ONLY - NO Settings or Logout here */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.id}
                href={item.path}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-orange-50 text-orange-600 border-r-2 border-orange-500'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {sidebarOpen && (
                  <span className="flex-1 text-left text-sm font-medium">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* NO Logout button here - Logout is only in top navbar profile dropdown */}
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 min-h-screen ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}