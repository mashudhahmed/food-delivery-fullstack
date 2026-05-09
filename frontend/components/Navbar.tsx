'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  ShoppingBag, 
  Heart, 
  User, 
  LogOut, 
  Menu, 
  X, 
  Store, 
  LayoutDashboard,
  Package,
  Users,
  Settings,
  MapPin,
  ChevronDown,
  Globe,
  Search,
  Clock
} from 'lucide-react';
import { auth } from '@/app/lib/api';
import { useCartStore } from '@/app/stores/cartStore';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deliveryType, setDeliveryType] = useState('delivery');
  
  const cartItems = useCartStore((state) => state.items);
  const cartItemsCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  // Check page types
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isHomePage = pathname === '/';
  const isRestaurantPage = pathname?.startsWith('/restaurants/') && pathname !== '/restaurants';
  const isDashboardPage = pathname?.startsWith('/admin') || pathname?.startsWith('/owner') || pathname?.startsWith('/agent');

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
    setIsProfileOpen(false);
    toast.success('Logged out successfully');
    router.push('/login');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/?search=${encodeURIComponent(searchTerm)}`);
      setIsMobileMenuOpen(false);
    }
  };

  // Don't show navbar on auth pages
  if (isAuthPage) return null;

  // ========== ROLE-BASED NAVIGATION LINKS ==========
  
  const getRoleBasedLinks = () => {
    if (!isAuthenticated) return [];
    
    switch (user?.role) {
      case 'admin':
        return [
          { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/admin/users', label: 'Users', icon: Users },
          { href: '/admin/restaurants', label: 'Restaurants', icon: Store },
          { href: '/admin/orders', label: 'Orders', icon: Package },
          { href: '/admin/settings', label: 'Settings', icon: Settings },
        ];
      case 'owner':
        return [
          { href: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/owner/restaurants', label: 'My Restaurants', icon: Store },
          { href: '/owner/orders', label: 'Orders', icon: Package },
          { href: '/owner/menu', label: 'Menu', icon: Package },
        ];
      case 'agent':
        return [
          { href: '/agent/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/agent/deliveries', label: 'My Deliveries', icon: Package },
          { href: '/agent/earnings', label: 'Earnings', icon: Package },
        ];
      default:
        return [
          { href: '/', label: 'Home', icon: Home },
          { href: '/orders', label: 'My Orders', icon: Package },
          { href: '/favorites', label: 'Favorites', icon: Heart },
        ];
    }
  };

  const roleBasedLinks = getRoleBasedLinks();

  // ========== HOME PAGE NAVBAR (Foodpanda Style) ==========
  if (isHomePage) {
    return (
      <>
        {/* Main Header */}
        <div className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="shrink-0">
                <div className="flex items-center gap-2">
                  <Image src="/logo.png" alt="QuickBite" width={32} height={32} className="w-8 h-8 object-contain" />
                  <span className="text-xl font-bold text-orange-500">QuickBite</span>
                </div>
              </Link>

              {/* Address Selector */}
              <div className="hidden lg:flex items-center gap-2 bg-gray-100 px-4 py-2.5 rounded-full cursor-pointer hover:bg-gray-200 transition border border-gray-200">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium text-gray-700">New address</span>
                <span className="text-sm text-gray-500">Select your address</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-3">
                {/* Cart Icon */}
                {isAuthenticated && user?.role === 'customer' && (
                  <Link href="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition">
                    <ShoppingBag className="w-5 h-5 text-gray-600" />
                    {cartItemsCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartItemsCount}
                      </span>
                    )}
                  </Link>
                )}

                {/* Auth / User Menu */}
                {isAuthenticated ? (
                  <div className="relative">
                    <button
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center gap-2 text-sm font-medium hover:text-orange-500 transition"
                    >
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-orange-600" />
                      </div>
                      <span className="hidden sm:inline">{user?.fullName?.split(' ')[0]}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {isProfileOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                        <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border py-2 z-50">
                          <div className="px-4 py-2 border-b">
                            <p className="text-sm font-medium text-gray-800">{user?.fullName}</p>
                            <p className="text-xs text-gray-500">{user?.email}</p>
                          </div>
                          {roleBasedLinks.map((link) => (
                            <Link
                              key={link.href}
                              href={link.href}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              onClick={() => setIsProfileOpen(false)}
                            >
                              <link.icon className="w-4 h-4" />
                              {link.label}
                            </Link>
                          ))}
                          <hr className="my-1" />
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                          >
                            <LogOut className="w-4 h-4" />
                            Logout
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
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

                {/* Language Selector */}
                <button className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-600 px-3 py-2 rounded-full hover:bg-gray-100 transition">
                  <Globe className="w-4 h-4" />
                  EN
                  <ChevronDown className="w-3 h-3" />
                </button>

                {/* Mobile Menu Button */}
                <button className="md:hidden p-2" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Delivery/Pickup Toggle + Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 py-3 border-t">
              {/* Delivery/Pickup Toggle */}
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

              {/* Search Bar */}
              <div className="flex-1 w-full">
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search for restaurants, cuisines, and dishes"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-2.5 text-gray-800 placeholder-gray-400 rounded-full border border-gray-200 focus:outline-none focus:border-orange-500 bg-gray-50 hover:bg-white transition"
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

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-34 bg-white z-40 overflow-auto border-t">
            <div className="p-4 space-y-4">
              {roleBasedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <link.icon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700">{link.label}</span>
                </Link>
              ))}
              <hr />
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 w-full p-3 rounded-lg text-red-600 hover:bg-red-50"
              >
                <LogOut className="w-5 h-5" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // ========== RESTAURANT DETAIL PAGE NAVBAR ==========
  if (isRestaurantPage) {
    return (
      <div className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="QuickBite" width={32} height={32} className="w-8 h-8 object-contain" />
              <span className="text-xl font-bold text-orange-500 hidden sm:block">QuickBite</span>
            </Link>

            <div className="flex items-center gap-3">
              {/* Cart Icon */}
              {isAuthenticated && user?.role === 'customer' && (
                <Link href="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition">
                  <ShoppingBag className="w-5 h-5 text-gray-600" />
                  {cartItemsCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {cartItemsCount}
                    </span>
                  )}
                </Link>
              )}

              {/* User Menu */}
              {isAuthenticated ? (
                <div className="relative">
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 text-sm font-medium hover:text-orange-500 transition"
                  >
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="hidden sm:inline">{user?.fullName?.split(' ')[0]}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {isProfileOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border py-2 z-50">
                        {roleBasedLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsProfileOpen(false)}
                          >
                            <link.icon className="w-4 h-4" />
                            {link.label}
                          </Link>
                        ))}
                        <hr className="my-1" />
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                        >
                          <LogOut className="w-4 h-4" />
                          Logout
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
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
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== DASHBOARD NAVBAR (Minimal) ==========
  if (isDashboardPage) {
    return (
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="QuickBite" width={32} height={32} className="w-8 h-8 object-contain" />
              <span className="text-xl font-bold text-orange-500">QuickBite</span>
            </Link>

            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600 capitalize">
                {user?.role === 'admin' ? 'Admin Panel' : user?.role === 'owner' ? 'Owner Panel' : 'Agent Panel'}
              </span>
              
              <button onClick={handleLogout} className="text-sm text-red-500 hover:text-red-600">
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ========== DEFAULT NAVBAR (Other Pages) ==========
  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="QuickBite" width={32} height={32} className="w-8 h-8 object-contain" />
            <span className="text-xl font-bold text-orange-500 hidden sm:block">QuickBite</span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {roleBasedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition ${
                  pathname === link.href
                    ? 'text-orange-500 border-b-2 border-orange-500 pb-1'
                    : 'text-gray-700 hover:text-orange-500'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            {/* Cart Icon */}
            {isAuthenticated && user?.role === 'customer' && (
              <Link href="/cart" className="relative p-2 hover:bg-gray-100 rounded-full transition">
                <ShoppingBag className="w-5 h-5 text-gray-600" />
                {cartItemsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItemsCount}
                  </span>
                )}
              </Link>
            )}

            {/* User Menu */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-2 text-sm font-medium hover:text-orange-500 transition"
                >
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className="hidden sm:inline">{user?.fullName?.split(' ')[0]}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>

                {isProfileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border py-2 z-50">
                      <div className="px-4 py-2 border-b">
                        <p className="text-sm font-medium text-gray-800">{user?.fullName}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      {roleBasedLinks.map((link) => (
                        <Link
                          key={link.href}
                          href={link.href}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <link.icon className="w-4 h-4" />
                          {link.label}
                        </Link>
                      ))}
                      <hr className="my-1" />
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
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
          </div>
        </div>
      </div>
    </div>
  );
}