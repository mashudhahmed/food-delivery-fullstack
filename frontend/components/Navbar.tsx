// components/Navbar.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import NotificationDropdown from './NotificationDropdown';
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
  Clock,
  Shield,
  Bell,
  Truck,
  Briefcase,
  CreditCard,
  HelpCircle,
  Star,
  TrendingUp
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { useCartStore } from '@/stores/cartStore';
import { useAddressStore } from '@/stores/addressStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import Image from 'next/image';
import toast from 'react-hot-toast';
import LocationModal from './LocationModal';
import LogoutModal from './LogoutModal';
import AuthModal from './AuthModal';
import { BiCycling } from 'react-icons/bi';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');

  const cartItems = useCartStore((state) => state.items);
  const cartItemsCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const favoritesCount = useFavoritesStore((state) => state.items.length);
  const { selectedAddress, setIsLocationModalOpen, isLocationModalOpen } = useAddressStore();

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isHomePage = pathname === '/';
  const isRestaurantPage = pathname?.startsWith('/restaurants/') && pathname !== '/restaurants';
  const isDashboardPage = pathname?.startsWith('/admin') || pathname?.startsWith('/owner') || pathname?.startsWith('/agent');

  // Handle click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isMobileMenuOpen || isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen, isProfileOpen]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMobileMenuOpen) setIsMobileMenuOpen(false);
        if (isProfileOpen) setIsProfileOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, isProfileOpen]);

  useEffect(() => {
    const handleAuthChange = () => {
      const authenticated = auth.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        const currentUser = auth.getCurrentUser();
        setUser(currentUser);
        if (currentUser?.role === 'customer') {
          useFavoritesStore.getState().loadFavorites();
        }
      } else {
        setUser(null);
      }
    };

    const authenticated = auth.isAuthenticated();
    setIsAuthenticated(authenticated);
    if (authenticated) {
      const currentUser = auth.getCurrentUser();
      setUser(currentUser);
      if (currentUser?.role === 'customer') {
        useFavoritesStore.getState().loadFavorites();
      }
    }

    window.addEventListener('auth-change', handleAuthChange);
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
    setIsProfileOpen(false);
  };

  const handleConfirmLogout = async () => {
    setIsLogoutModalOpen(false);
    try {
      await auth.logout();                 // important: await
      setUser(null);
      setIsAuthenticated(false);
      // Clear favorites from memory
      try {
        useFavoritesStore.getState().clearFavorites?.();
      } catch {}
      toast.success('Logged out successfully');
    } catch (err) {
      console.error('Logout error:', err);
      toast.error('Logout failed');
    } finally {
      // Hard redirect guarantees clean state
      window.location.href = '/';
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/?search=${encodeURIComponent(searchTerm)}`);
      setIsMobileMenuOpen(false);
    }
  };

  const openLoginModal = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const openSignupModal = () => {
    setAuthModalMode('signup');
    setIsAuthModalOpen(true);
  };

  if (isAuthPage) return null;

  const getRoleBasedLinks = () => {
    if (!isAuthenticated) return [];

    switch (user?.role) {
      case 'admin':
        return [
          { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
          { href: '/admin/applications', label: 'Applications', icon: Briefcase },
          { href: '/admin/users', label: 'Users', icon: Users },
          { href: '/admin/restaurants', label: 'Restaurants', icon: Store },
          { href: '/admin/orders', label: 'Orders', icon: Package },
          { href: '/admin/delivery-agents', label: 'Delivery Agents', icon: Truck },
          { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
        ];
      case 'owner':
        return [
          { href: '/owner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/owner/restaurants', label: 'My Restaurants', icon: Store },
          { href: '/owner/orders', label: 'Orders', icon: Package },
          { href: '/owner/menu', label: 'Menu', icon: Package },
          { href: '/owner/analytics', label: 'Analytics', icon: TrendingUp },
        ];
      case 'agent':
        return [
          { href: '/agent/dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { href: '/agent/deliveries', label: 'My Deliveries', icon: Package },
          { href: '/agent/earnings', label: 'Earnings', icon: TrendingUp },
          { href: '/agent/schedule', label: 'Schedule', icon: Clock },
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

  const getDashboardIcon = () => {
    switch (user?.role) {
      case 'admin': return <Shield className="w-5 h-5 text-orange-500" aria-hidden="true" />;
      case 'owner': return <Store className="w-5 h-5 text-orange-500" aria-hidden="true" />;
      case 'agent': return <BiCycling className="w-5 h-5 text-orange-500" aria-hidden="true" />;
      default: return <LayoutDashboard className="w-5 h-5 text-orange-500" aria-hidden="true" />;
    }
  };

  // ========== HOME PAGE NAVBAR ==========
  if (isHomePage) {
    return (
      <>
        <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
        <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} onConfirm={handleConfirmLogout} />
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authModalMode} />

        <nav className="bg-white shadow-sm sticky top-0 z-50" role="navigation" aria-label="Main navigation">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="shrink-0 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-lg" aria-label="QuickBite Home">
                <div className="flex items-center gap-2">
                  <Image src="/logo.png" alt="QuickBite" width={32} height={32} className="w-8 h-8 object-contain" priority />
                  <span className="text-xl font-bold text-orange-500">QuickBite</span>
                </div>
              </Link>

              {/* Location Selector */}
              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="hidden lg:flex items-center gap-2 bg-gray-100 px-4 py-2.5 rounded-full hover:bg-gray-200 transition border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
                aria-label="Select delivery location"
              >
                <MapPin className="w-4 h-4 text-orange-500" aria-hidden="true" />
                <span className="text-sm font-medium text-gray-700">{selectedAddress ? selectedAddress.area || selectedAddress.name : 'New address'}</span>
                <span className="text-sm text-gray-500">{selectedAddress ? selectedAddress.city : 'Select your address'}</span>
                <ChevronDown className="w-4 h-4 text-gray-400" aria-hidden="true" />
              </button>

              {/* Right Side Icons */}
              <div className="flex items-center gap-3">
                {isAuthenticated && user?.role === 'customer' && <NotificationDropdown />}

                {isAuthenticated && user?.role === 'customer' && (
                  <Link
                    href="/favorites"
                    className="relative p-2 hover:bg-gray-100 rounded-full transition focus:outline-none focus:ring-2 focus:ring-orange-500"
                    aria-label={`View favorites${favoritesCount > 0 ? `, ${favoritesCount} items` : ''}`}
                  >
                    <Heart className="w-5 h-5 text-gray-600" aria-hidden="true" />
                    {favoritesCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {favoritesCount > 9 ? '9+' : favoritesCount}
                      </span>
                    )}
                  </Link>
                )}

                {isAuthenticated && user?.role === 'customer' && (
                  <Link
                    href="/cart"
                    className="relative p-2 hover:bg-gray-100 rounded-full transition focus:outline-none focus:ring-2 focus:ring-orange-500"
                    aria-label={`View cart${cartItemsCount > 0 ? `, ${cartItemsCount} items` : ''}`}
                  >
                    <ShoppingBag className="w-5 h-5 text-gray-600" aria-hidden="true" />
                    {cartItemsCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartItemsCount}
                      </span>
                    )}
                  </Link>
                )}

                {isAuthenticated ? (
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center gap-2 text-sm font-medium hover:text-orange-500 transition focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-lg px-2 py-1"
                      aria-label={isProfileOpen ? 'Close profile menu' : 'Open profile menu'}
                      aria-expanded={isProfileOpen}
                      aria-haspopup="true"
                    >
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-orange-600" aria-hidden="true" />
                      </div>
                      <span className="hidden sm:inline">{user?.fullName?.split(' ')[0]}</span>
                      <ChevronDown className="w-4 h-4" aria-hidden="true" />
                    </button>

                    {isProfileOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border py-2 z-50" role="menu">
                        <div className="px-4 py-2 border-b" role="none">
                          <p className="text-sm font-medium text-gray-800">{user?.fullName}</p>
                          <p className="text-xs text-gray-500">{user?.email}</p>
                        </div>
                        {roleBasedLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsProfileOpen(false)}
                            role="menuitem"
                          >
                            <link.icon className="w-4 h-4" aria-hidden="true" /> {link.label}
                          </Link>
                        ))}
                        <Link
                          href="/settings"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setIsProfileOpen(false)}
                          role="menuitem"
                        >
                          <Settings className="w-4 h-4" aria-hidden="true" /> Settings
                        </Link>
                        <hr className="my-1" role="separator" />
                        <button
                          onClick={handleLogoutClick}
                          className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                          role="menuitem"
                        >
                          <LogOut className="w-4 h-4" aria-hidden="true" /> Logout
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openLoginModal}
                      className="text-sm font-medium text-gray-600 hover:text-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-lg px-3 py-2"
                    >
                      Log in
                    </button>
                    <button
                      onClick={openSignupModal}
                      className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-orange-600 transition focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                    >
                      Sign up
                    </button>
                  </div>
                )}

                <button
                  className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-600 px-3 py-2 rounded-full hover:bg-gray-100 transition"
                  aria-label="Change language"
                >
                  <Globe className="w-4 h-4" aria-hidden="true" /> EN <ChevronDown className="w-3 h-3" aria-hidden="true" />
                </button>

                <button
                  className="md:hidden p-2 focus:outline-none focus:ring-2 focus:ring-orange-500 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-4 py-3 border-t border-gray-200">
              <div className="flex gap-1 bg-gray-100 rounded-full p-1 shrink-0">
                <button
                  onClick={() => setDeliveryType('delivery')}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                    deliveryType === 'delivery' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Delivery
                </button>
                <button
                  onClick={() => setDeliveryType('pickup')}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition ${
                    deliveryType === 'pickup' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  Pick-up
                </button>
              </div>

              <div className="flex-1 w-full">
                <form onSubmit={handleSearch} className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search for restaurants, cuisines, and dishes... (⌘K)"
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
        </nav>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div ref={mobileMenuRef} className="md:hidden fixed inset-0 top-34 bg-white z-40 overflow-auto border-t">
            <div className="p-4 space-y-4">
              <button
                onClick={() => { setIsLocationModalOpen(true); setIsMobileMenuOpen(false); }}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 w-full"
              >
                <MapPin className="w-5 h-5 text-orange-500" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-800">{selectedAddress ? selectedAddress.area || selectedAddress.name : 'Select address'}</p>
                  <p className="text-xs text-gray-500">{selectedAddress ? selectedAddress.city : 'Choose delivery location'}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
              </button>

              {isAuthenticated && user?.role === 'customer' && (
                <Link href="/favorites" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50" onClick={() => setIsMobileMenuOpen(false)}>
                  <Heart className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700">Favorites</span>
                </Link>
              )}

              {roleBasedLinks.map((link) => (
                <Link key={link.href} href={link.href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50" onClick={() => setIsMobileMenuOpen(false)}>
                  <link.icon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-700">{link.label}</span>
                </Link>
              ))}

              <Link href="/settings" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50" onClick={() => setIsMobileMenuOpen(false)}>
                <Settings className="w-5 h-5 text-gray-500" />
                <span className="text-gray-700">Settings</span>
              </Link>

              <hr />
              <button onClick={handleLogoutClick} className="flex items-center gap-3 w-full p-3 rounded-lg text-red-600 hover:bg-red-50">
                <LogOut className="w-5 h-5" /> Logout
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
      <>
        <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
        <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} onConfirm={handleConfirmLogout} />
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authModalMode} />

        <nav className="bg-white shadow-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2">
                <Image src="/logo.png" alt="QuickBite" width={32} height={32} className="w-8 h-8 object-contain" priority />
                <span className="text-xl font-bold text-orange-500 hidden sm:block">QuickBite</span>
              </Link>

              <div className="flex items-center gap-3">
                {isAuthenticated && user?.role === 'customer' && <NotificationDropdown />}
                {isAuthenticated && user?.role === 'customer' && (
                  <Link href="/favorites" className="relative p-2 hover:bg-gray-100 rounded-full">
                    <Heart className="w-5 h-5 text-gray-600" />
                    {favoritesCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {favoritesCount > 9 ? '9+' : favoritesCount}
                      </span>
                    )}
                  </Link>
                )}
                {isAuthenticated && user?.role === 'customer' && (
                  <Link href="/cart" className="relative p-2 hover:bg-gray-100 rounded-full">
                    <ShoppingBag className="w-5 h-5 text-gray-600" />
                    {cartItemsCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartItemsCount}
                      </span>
                    )}
                  </Link>
                )}

                {isAuthenticated ? (
                  <div className="relative" ref={profileMenuRef}>
                    <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 text-sm font-medium hover:text-orange-500">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-orange-600" />
                      </div>
                      <span className="hidden sm:inline">{user?.fullName?.split(' ')[0]}</span>
                      <ChevronDown className="w-4 h-4" />
                    </button>

                    {isProfileOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border py-2 z-50">
                        {roleBasedLinks.map((link) => (
                          <Link key={link.href} href={link.href} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsProfileOpen(false)}>
                            <link.icon className="w-4 h-4" /> {link.label}
                          </Link>
                        ))}
                        <Link href="/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsProfileOpen(false)}>
                          <Settings className="w-4 h-4" /> Settings
                        </Link>
                        <hr className="my-1" />
                        <button onClick={handleLogoutClick} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">
                          <LogOut className="w-4 h-4" /> Logout
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={openLoginModal} className="text-sm font-medium text-gray-600 hover:text-orange-500 px-3 py-2">Log in</button>
                    <button onClick={openSignupModal} className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-orange-600">Sign up</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>
      </>
    );
  }

  // ========== DASHBOARD NAVBAR ==========
  if (isDashboardPage) {
    const userRole = user?.role || 'admin';
    const dashboardPath = `/${userRole}/dashboard`;

    const getPortalTitle = () => {
      switch (userRole) {
        case 'admin': return 'Admin Portal';
        case 'owner': return 'Owner Portal';
        case 'agent': return 'Agent Portal';
        default: return 'Dashboard';
      }
    };

    return (
      <>
        <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} onConfirm={handleConfirmLogout} />
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authModalMode} />

        <nav className="bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-40">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <button onClick={() => router.push(dashboardPath)} className="flex items-center gap-2.5 hover:opacity-80 transition">
                <Image src="/logo.png" alt="QuickBite" width={38} height={38} className="w-9.5 h-9.5 object-contain" priority />
                <div className="flex flex-col items-start">
                  <span className="text-lg font-bold text-orange-500 leading-tight">QuickBite</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full -mt-0.5">
                    {getPortalTitle()}
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-0.5">
                <NotificationDropdown />
                <button className="p-2.5 hover:bg-gray-100 rounded-full">
                  <HelpCircle className="w-5 h-5 text-gray-500" />
                </button>
                <Link href="/settings" className="p-2.5 hover:bg-gray-100 rounded-full">
                  <Settings className="w-5 h-5 text-gray-500" />
                </Link>
                <div className="w-px h-6 bg-gray-200 mx-1.5" />

                <div className="relative" ref={profileMenuRef}>
                  <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 text-sm font-medium hover:bg-gray-50 pl-1 pr-2.5 py-1 rounded-full">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <User className="w-4.5 h-4.5 text-orange-600" />
                    </div>
                    <span className="hidden sm:inline text-gray-700">{user?.fullName?.split(' ')[0] || 'User'}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border py-2 z-50">
                      <div className="px-4 py-2 border-b">
                        <p className="text-sm font-medium text-gray-800">{user?.fullName || 'User'}</p>
                        <p className="text-xs text-gray-500">{user?.email || 'user@example.com'}</p>
                        <div className="flex items-center gap-1 mt-2">
                          {getDashboardIcon()}
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full capitalize">{user?.role || 'admin'}</span>
                        </div>
                      </div>
                      <Link href="/profile" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsProfileOpen(false)}>
                        <User className="w-4 h-4" /> My Profile
                      </Link>
                      <Link href="/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsProfileOpen(false)}>
                        <Settings className="w-4 h-4" /> Account Settings
                      </Link>
                      <hr className="my-1" />
                      <button onClick={handleLogoutClick} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </nav>
      </>
    );
  }

  // ========== DEFAULT NAVBAR ==========
  return (
    <>
      <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
      <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} onConfirm={handleConfirmLogout} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authModalMode} />

      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="QuickBite" width={32} height={32} className="w-8 h-8 object-contain" priority />
              <span className="text-xl font-bold text-orange-500 hidden sm:block">QuickBite</span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              {roleBasedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium transition ${
                    pathname === link.href ? 'text-orange-500 border-b-2 border-orange-500 pb-1' : 'text-gray-700 hover:text-orange-500'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated && user?.role === 'customer' && (
                <>
                  <Link href="/favorites" className="relative p-2 hover:bg-gray-100 rounded-full">
                    <Heart className="w-5 h-5 text-gray-600" />
                    {favoritesCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {favoritesCount > 9 ? '9+' : favoritesCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/cart" className="relative p-2 hover:bg-gray-100 rounded-full">
                    <ShoppingBag className="w-5 h-5 text-gray-600" />
                    {cartItemsCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartItemsCount}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {isAuthenticated ? (
                <div className="relative" ref={profileMenuRef}>
                  <button onClick={() => setIsProfileOpen(!isProfileOpen)} className="flex items-center gap-2 text-sm font-medium hover:text-orange-500">
                    <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="hidden sm:inline">{user?.fullName?.split(' ')[0]}</span>
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border py-2 z-50">
                      <div className="px-4 py-2 border-b">
                        <p className="text-sm font-medium text-gray-800">{user?.fullName}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                      </div>
                      {roleBasedLinks.map((link) => (
                        <Link key={link.href} href={link.href} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsProfileOpen(false)}>
                          <link.icon className="w-4 h-4" /> {link.label}
                        </Link>
                      ))}
                      <Link href="/settings" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setIsProfileOpen(false)}>
                        <Settings className="w-4 h-4" /> Settings
                      </Link>
                      <hr className="my-1" />
                      <button onClick={handleLogoutClick} className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50">
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={openLoginModal} className="text-sm font-medium text-gray-600 hover:text-orange-500 px-3 py-2">Log in</button>
                  <button onClick={openSignupModal} className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-orange-600">Sign up</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}