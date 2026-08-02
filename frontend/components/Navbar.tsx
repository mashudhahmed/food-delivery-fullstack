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
  Truck,
  Briefcase,
  HelpCircle,
  TrendingUp,
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
  const cartItemsCount = cartItems.reduce((t, i) => t + i.quantity, 0);
  const favoritesCount = useFavoritesStore((state) => state.items.length);
  const { selectedAddress, setIsLocationModalOpen, isLocationModalOpen } =
    useAddressStore();

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isHomePage = pathname === '/';
  const isRestaurantPage =
    pathname?.startsWith('/restaurants/') && pathname !== '/restaurants';
  const isDashboardPage =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/owner') ||
    pathname?.startsWith('/agent');

  // Click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isMobileMenuOpen || isProfileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen, isProfileOpen]);

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsProfileOpen(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auth + open-auth-modal
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

    const handleOpenAuthModal = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setAuthModalMode(detail?.mode === 'signup' ? 'signup' : 'login');
      setIsAuthModalOpen(true);
    };

    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('open-auth-modal', handleOpenAuthModal);
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('open-auth-modal', handleOpenAuthModal);
    };
  }, []);

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
    setIsProfileOpen(false);
  };

  const handleConfirmLogout = async () => {
    setIsLogoutModalOpen(false);
    try {
      await auth.logout();
      setUser(null);
      setIsAuthenticated(false);
      try {
        useFavoritesStore.getState().clearFavorites?.();
      } catch {}
      toast.success('Logged out successfully');
    } catch {
      toast.error('Logout failed');
    } finally {
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
          { href: '/admin/delivery-agents', label: 'Agents', icon: Truck },
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
          { href: '/agent/deliveries', label: 'Deliveries', icon: Package },
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
      case 'admin':
        return <Shield className="w-4 h-4 text-orange-500" />;
      case 'owner':
        return <Store className="w-4 h-4 text-orange-500" />;
      case 'agent':
        return <BiCycling className="w-4 h-4 text-orange-500" />;
      default:
        return <LayoutDashboard className="w-4 h-4 text-orange-500" />;
    }
  };

  // Shared icon button style
  const iconBtn =
    'relative p-2.5 rounded-xl hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-orange-500/40';

  // ========== HOME PAGE ==========
  if (isHomePage) {
    return (
      <>
        <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
        <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} onConfirm={handleConfirmLogout} />
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authModalMode} />

        <nav className="bg-white/90 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4">
            {/* Top row */}
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5 shrink-0">
                <Image src="/logo.png" alt="QuickBite" width={32} height={32} className="w-8 h-8 object-contain" priority />
                <span className="text-xl font-bold text-orange-500 tracking-tight">QuickBite</span>
              </Link>

              {/* Location */}
              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="hidden lg:flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-full border border-slate-200 transition text-sm"
              >
                <MapPin className="w-4 h-4 text-orange-500" />
                <span className="font-medium text-slate-700 max-w-30 truncate">
                  {selectedAddress ? selectedAddress.area || selectedAddress.name : 'New address'}
                </span>
                <span className="text-slate-400 max-w-25 truncate">
                  {selectedAddress ? selectedAddress.city : 'Select'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Right actions */}
              <div className="flex items-center gap-1.5">
                {isAuthenticated && user?.role === 'customer' && <NotificationDropdown />}

                {isAuthenticated && user?.role === 'customer' && (
                  <Link href="/favorites" className={iconBtn} aria-label="Favorites">
                    <Heart className="w-5 h-5 text-slate-600" />
                    {favoritesCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {favoritesCount > 9 ? '9+' : favoritesCount}
                      </span>
                    )}
                  </Link>
                )}

                {isAuthenticated && user?.role === 'customer' && (
                  <Link href="/cart" className={iconBtn} aria-label="Cart">
                    <ShoppingBag className="w-5 h-5 text-slate-600" />
                    {cartItemsCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {cartItemsCount}
                      </span>
                    )}
                  </Link>
                )}

                {isAuthenticated ? (
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full hover:bg-slate-100 transition"
                    >
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-orange-600" />
                      </div>
                      <span className="hidden sm:inline text-sm font-medium text-slate-700">
                        {user?.fullName?.split(' ')[0]}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>

                    {isProfileOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-100 py-2 z-50 overflow-hidden">
                        <div className="px-4 py-3 border-b border-slate-100">
                          <p className="text-sm font-semibold text-slate-900 truncate">{user?.fullName}</p>
                          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                        </div>
                        {roleBasedLinks.map((link) => (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition"
                          >
                            <link.icon className="w-4 h-4 text-slate-400" />
                            {link.label}
                          </Link>
                        ))}
                        <Link
                          href="/settings"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition"
                        >
                          <Settings className="w-4 h-4 text-slate-400" />
                          Settings
                        </Link>
                        <div className="my-1 border-t border-slate-100" />
                        <button
                          onClick={handleLogoutClick}
                          className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                        >
                          <LogOut className="w-4 h-4" />
                          Log out
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={openLoginModal}
                      className="text-sm font-medium text-slate-600 hover:text-orange-600 px-3 py-2 rounded-xl transition"
                    >
                      Log in
                    </button>
                    <button
                      onClick={openSignupModal}
                      className="text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-full shadow-sm shadow-orange-500/20 transition"
                    >
                      Sign up
                    </button>
                  </div>
                )}

                <button className="hidden md:flex items-center gap-1 text-sm text-slate-500 px-2.5 py-2 rounded-xl hover:bg-slate-100 transition">
                  <Globe className="w-4 h-4" />
                  EN
                </button>

                <button
                  className="md:hidden p-2.5 rounded-xl hover:bg-slate-100 transition"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                  {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Search row */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pb-3">
              <div className="flex p-1 bg-slate-100 rounded-full shrink-0">
                {(['delivery', 'pickup'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setDeliveryType(type)}
                    className={`px-5 py-1.5 rounded-full text-sm font-medium capitalize transition ${
                      deliveryType === type
                        ? 'bg-white text-orange-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {type === 'pickup' ? 'Pick-up' : 'Delivery'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSearch} className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search restaurants, cuisines... (⌘K)"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-10 py-2.5 rounded-full border border-slate-200 bg-slate-50/80 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-400 focus:bg-white transition"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </form>
            </div>
          </div>
        </nav>

        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div ref={mobileMenuRef} className="md:hidden fixed inset-x-0 top-30 bottom-0 bg-white z-40 overflow-y-auto border-t border-slate-100">
            <div className="p-4 space-y-1">
              <button
                onClick={() => {
                  setIsLocationModalOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 w-full p-3.5 rounded-2xl bg-slate-50 mb-3"
              >
                <MapPin className="w-5 h-5 text-orange-500" />
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {selectedAddress ? selectedAddress.area || selectedAddress.name : 'Select address'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {selectedAddress ? selectedAddress.city : 'Choose delivery location'}
                  </p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {isAuthenticated && user?.role === 'customer' && (
                <Link
                  href="/favorites"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-slate-50 text-slate-700"
                >
                  <Heart className="w-5 h-5 text-slate-400" />
                  Favorites
                </Link>
              )}

              {roleBasedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-slate-50 text-slate-700"
                >
                  <link.icon className="w-5 h-5 text-slate-400" />
                  {link.label}
                </Link>
              ))}

              <Link
                href="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-slate-50 text-slate-700"
              >
                <Settings className="w-5 h-5 text-slate-400" />
                Settings
              </Link>

              {isAuthenticated && (
                <>
                  <div className="my-2 border-t border-slate-100" />
                  <button
                    onClick={handleLogoutClick}
                    className="flex items-center gap-3 w-full p-3.5 rounded-xl text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-5 h-5" />
                    Log out
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </>
    );
  }

  // ========== RESTAURANT / DEFAULT / DASHBOARD ==========
  // (same structure, softer styles — abbreviated for length but fully functional)

  if (isRestaurantPage) {
    return (
      <>
        <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
        <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} onConfirm={handleConfirmLogout} />
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authModalMode} />

        <nav className="bg-white/90 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <Link href="/" className="flex items-center gap-2.5">
                <Image src="/logo.png" alt="QuickBite" width={32} height={32} className="w-8 h-8 object-contain" priority />
                <span className="text-xl font-bold text-orange-500 tracking-tight hidden sm:block">QuickBite</span>
              </Link>

              <div className="flex items-center gap-1.5">
                {isAuthenticated && user?.role === 'customer' && <NotificationDropdown />}
                {isAuthenticated && user?.role === 'customer' && (
                  <Link href="/favorites" className={iconBtn}>
                    <Heart className="w-5 h-5 text-slate-600" />
                    {favoritesCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {favoritesCount > 9 ? '9+' : favoritesCount}
                      </span>
                    )}
                  </Link>
                )}
                {isAuthenticated && user?.role === 'customer' && (
                  <Link href="/cart" className={iconBtn}>
                    <ShoppingBag className="w-5 h-5 text-slate-600" />
                    {cartItemsCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {cartItemsCount}
                      </span>
                    )}
                  </Link>
                )}

                {isAuthenticated ? (
                  <div className="relative" ref={profileMenuRef}>
                    <button
                      onClick={() => setIsProfileOpen(!isProfileOpen)}
                      className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full hover:bg-slate-100 transition"
                    >
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-orange-600" />
                      </div>
                      <span className="hidden sm:inline text-sm font-medium text-slate-700">
                        {user?.fullName?.split(' ')[0]}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    {isProfileOpen && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
                        {roleBasedLinks.map((link) => (
                          <Link key={link.href} href={link.href} onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                            <link.icon className="w-4 h-4 text-slate-400" /> {link.label}
                          </Link>
                        ))}
                        <Link href="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                          <Settings className="w-4 h-4 text-slate-400" /> Settings
                        </Link>
                        <div className="my-1 border-t border-slate-100" />
                        <button onClick={handleLogoutClick} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                          <LogOut className="w-4 h-4" /> Log out
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button onClick={openLoginModal} className="text-sm font-medium text-slate-600 hover:text-orange-600 px-3 py-2 rounded-xl">Log in</button>
                    <button onClick={openSignupModal} className="text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-full">Sign up</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>
      </>
    );
  }

  // Dashboard navbar
  if (isDashboardPage) {
    const userRole = user?.role || 'admin';
    const dashboardPath = `/${userRole}/dashboard`;
    const portalTitle =
      userRole === 'admin' ? 'Admin Portal' : userRole === 'owner' ? 'Owner Portal' : userRole === 'agent' ? 'Agent Portal' : 'Dashboard';

    return (
      <>
        <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} onConfirm={handleConfirmLogout} />
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authModalMode} />

        <nav className="bg-white/90 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-40">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <button onClick={() => router.push(dashboardPath)} className="flex items-center gap-2.5 hover:opacity-80 transition">
                <Image src="/logo.png" alt="QuickBite" width={36} height={36} className="w-9 h-9 object-contain" priority />
                <div className="flex flex-col items-start">
                  <span className="text-lg font-bold text-orange-500 leading-tight tracking-tight">QuickBite</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full -mt-0.5">
                    {portalTitle}
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-0.5">
                <NotificationDropdown />
                <button className={iconBtn}><HelpCircle className="w-5 h-5 text-slate-500" /></button>
                <Link href="/settings" className={iconBtn}><Settings className="w-5 h-5 text-slate-500" /></Link>
                <div className="w-px h-6 bg-slate-200 mx-1.5" />

                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-slate-50 transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="hidden sm:inline text-sm font-medium text-slate-700">
                      {user?.fullName?.split(' ')[0] || 'User'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-900">{user?.fullName || 'User'}</p>
                        <p className="text-xs text-slate-400">{user?.email}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          {getDashboardIcon()}
                          <span className="text-[11px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full capitalize font-medium">
                            {user?.role || 'admin'}
                          </span>
                        </div>
                      </div>
                      <Link href="/profile" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                        <User className="w-4 h-4 text-slate-400" /> My Profile
                      </Link>
                      <Link href="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                        <Settings className="w-4 h-4 text-slate-400" /> Settings
                      </Link>
                      <div className="my-1 border-t border-slate-100" />
                      <button onClick={handleLogoutClick} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                        <LogOut className="w-4 h-4" /> Log out
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

  // Default navbar
  return (
    <>
      <LocationModal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} />
      <LogoutModal isOpen={isLogoutModalOpen} onClose={() => setIsLogoutModalOpen(false)} onConfirm={handleConfirmLogout} />
      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} initialMode={authModalMode} />

      <nav className="bg-white/90 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="QuickBite" width={32} height={32} className="w-8 h-8 object-contain" priority />
              <span className="text-xl font-bold text-orange-500 tracking-tight hidden sm:block">QuickBite</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {roleBasedLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                    pathname === link.href
                      ? 'text-orange-600 bg-orange-50'
                      : 'text-slate-600 hover:text-orange-600 hover:bg-slate-50'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {isAuthenticated && user?.role === 'customer' && (
                <>
                  <Link href="/favorites" className={iconBtn}>
                    <Heart className="w-5 h-5 text-slate-600" />
                    {favoritesCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {favoritesCount > 9 ? '9+' : favoritesCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/cart" className={iconBtn}>
                    <ShoppingBag className="w-5 h-5 text-slate-600" />
                    {cartItemsCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {cartItemsCount}
                      </span>
                    )}
                  </Link>
                </>
              )}

              {isAuthenticated ? (
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full hover:bg-slate-100 transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-orange-600" />
                    </div>
                    <span className="hidden sm:inline text-sm font-medium text-slate-700">
                      {user?.fullName?.split(' ')[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-900">{user?.fullName}</p>
                        <p className="text-xs text-slate-400">{user?.email}</p>
                      </div>
                      {roleBasedLinks.map((link) => (
                        <Link key={link.href} href={link.href} onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                          <link.icon className="w-4 h-4 text-slate-400" /> {link.label}
                        </Link>
                      ))}
                      <Link href="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50">
                        <Settings className="w-4 h-4 text-slate-400" /> Settings
                      </Link>
                      <div className="my-1 border-t border-slate-100" />
                      <button onClick={handleLogoutClick} className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                        <LogOut className="w-4 h-4" /> Log out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={openLoginModal} className="text-sm font-medium text-slate-600 hover:text-orange-600 px-3 py-2 rounded-xl">Log in</button>
                  <button onClick={openSignupModal} className="text-sm font-semibold text-white bg-orange-500 hover:bg-orange-600 px-4 py-2 rounded-full">Sign up</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}