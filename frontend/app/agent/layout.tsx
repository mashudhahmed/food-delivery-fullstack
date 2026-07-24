'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { auth } from '@/lib/auth';
import {
  LayoutDashboard,
  Package,
  DollarSign,
  Calendar,
  Menu,
  X,
  Bike,
  ClipboardList,
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/agent/dashboard' },
  { id: 'deliveries', label: 'My Deliveries', icon: Package, path: '/agent/deliveries' },
  { id: 'available', label: 'Available Orders', icon: ClipboardList, path: '/agent/available' },
  { id: 'earnings', label: 'Earnings', icon: DollarSign, path: '/agent/earnings' },
  { id: 'schedule', label: 'Schedule', icon: Calendar, path: '/agent/schedule' },
];

export default function AgentLayout({
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
    if (!currentUser || currentUser.role !== 'agent') {
      router.push('/');
      return;
    }
    setUser(currentUser);
  }, [router]);

  const initials = (user?.fullName || 'Agent')
    .split(' ')
    .map((p: string) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Sidebar Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white rounded-xl shadow-md shadow-black/5 border border-gray-100 active:scale-95 transition-transform"
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
      >
        {sidebarOpen ? <X className="w-5 h-5 text-gray-700" /> : <Menu className="w-5 h-5 text-gray-700" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-100 z-40 transition-[width] duration-300 ease-out flex flex-col ${
          sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
        } overflow-hidden`}
      >
        {/* Sidebar Header */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="shrink-0 relative">
              <Image
                src="/logo.png"
                alt="QuickBite"
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
                priority
              />
              {/* live status pulse - agent is online */}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-white flex items-center justify-center">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-gray-800 text-xl tracking-tight truncate">QuickBite</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                  Agent Portal
                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                  <span className="text-emerald-600 font-medium">Online</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-0.5 flex-1 overflow-y-auto">
          {sidebarOpen && (
            <p className="px-3 pt-2 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
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
                  <item.icon className="w-[18px] h-[18px]" />
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

        {/* Quiet profile footer */}
        <div className="p-3 border-t border-gray-100">
          <div className={`flex items-center gap-3 rounded-xl px-2 py-2 ${sidebarOpen ? '' : 'justify-center'}`}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-white text-xs font-semibold flex items-center justify-center shrink-0">
              {initials}
            </div>
            {sidebarOpen && (
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{user?.fullName || 'Agent'}</p>
                <p className="text-xs text-gray-400 truncate flex items-center gap-1">
                  <Bike className="w-3 h-3" />
                  Delivery Agent
                </p>
              </div>
            )}
          </div>
        </div>
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