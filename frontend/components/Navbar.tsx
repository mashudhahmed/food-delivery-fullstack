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

  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deliveryType, setDeliveryType] = useState('delivery');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'signup'>('login');
  const [cartBadgeAnimate, setCartBadgeAnimate] = useState(false);

  const cartItems = useCartStore((state) => state.items);
  const cartItemsCount = cartItems.reduce((t, i) => t + i.quantity, 0);
  const favoritesCount = useFavoritesStore((state) => state.items.length);
  const { selectedAddress, setIsLocationModalOpen, isLocationModalOpen } =
    useAddressStore();

  const prevCartCountRef = useRef(0);

  // Mount safety for SSR hydration & check pending auth modal
  useEffect(() => {
    setIsMounted(true);
    const storedModal = localStorage.getItem('openAuthModal');
    if (storedModal) {
      localStorage.removeItem('openAuthModal');
      setAuthModalMode(
        storedModal === 'register' || storedModal === 'signup'
          ? 'signup'
          : 'login'
      );
      setIsAuthModalOpen(true);
    }
  }, []);

  // Cart badge bounce animation on item addition
  useEffect(() => {
    if (isMounted) {
      if (cartItemsCount > prevCartCountRef.current && prevCartCountRef.current > 0) {
        setCartBadgeAnimate(true);
        const timer = setTimeout(() => setCartBadgeAnimate(false), 300);
        return () => clearTimeout(timer);
      }
      prevCartCountRef.current = cartItemsCount;
    }
  }, [cartItemsCount, isMounted]);

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isHomePage = pathname === '/';
  const isRestaurantPage =
    pathname?.startsWith('/restaurants/') && pathname !== '/restaurants';
  const isDashboardPage =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/owner') ||
    pathname?.startsWith('/agent');

  // Close menus on outside click
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

  // Keyboard navigation & shortcuts
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

  // Auth sync & custom events
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

    queueMicrotask(handleAuthChange);

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

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileOpen(false);
  }, [pathname]);

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

  const handleFavoritesClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      toast('Please log in to view your favorite restaurants', {
        icon: '❤️',
      });
      openLoginModal();
    }
  };

  if (isAuthPage) return null;

  // Whether user is in customer shopping context (both guests and registered customers)
  const isCustomerOrGuest = !isAuthenticated || user?.role === 'customer';

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

  // Reusable action buttons style
  const iconBtn =
    'relative p-2.5 rounded-xl hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-slate-700 hover:text-slate-900';

  // ========== RENDER RIGHT ACTIONS (DESKTOP & MOBILE HEADER) ==========
  const renderRightActions = () => (
    <div className="flex items-center gap-1 sm:gap-1.5">
      {/* Notifications (Customer only) */}
      {isAuthenticated && user?.role === 'customer' && <NotificationDropdown />}

      {/* Favorites (Customer & Guest) */}
      {isCustomerOrGuest && (
        <Link
          href="/favorites"
          onClick={handleFavoritesClick}
          className={iconBtn}
          aria-label="Favorites"
          title="Favorites"
        >
          <Heart className="w-5 h-5 text-slate-600 hover:text-red-500 transition-colors" />
          {isMounted && isAuthenticated && favoritesCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm shadow-red-500/30 animate-in zoom-in-50 duration-200">
              {favoritesCount > 9 ? '9+' : favoritesCount}
            </span>
          )}
        </Link>
      )}

      {/* Cart (Customer & Guest) */}
      {isCustomerOrGuest && (
        <Link
          href="/cart"
          className={iconBtn}
          aria-label={`Shopping cart with ${isMounted ? cartItemsCount : 0} items`}
          title={`Cart (${isMounted ? cartItemsCount : 0} items)`}
        >
          <ShoppingBag className="w-5 h-5 text-slate-600 hover:text-orange-500 transition-colors" />
          {isMounted && cartItemsCount > 0 && (
            <span
              className={`absolute -top-0.5 -right-0.5 min-w-5 h-5 px-1 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm shadow-orange-500/30 transition-transform duration-200 ${
                cartBadgeAnimate ? 'scale-125 bg-orange-600' : 'scale-100'
              }`}
            >
              {cartItemsCount > 99 ? '99+' : cartItemsCount}
            </span>
          )}
        </Link>
      )}

      {/* Profile or Login/Signup */}
      {isAuthenticated ? (
        <div className="relative" ref={profileMenuRef}>
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            aria-expanded={isProfileOpen}
            aria-label="User profile menu"
          >
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden ring-1 ring-orange-200">
              {user?.profilePicture ? (
                <Image
                  src={user.profilePicture}
                  alt="Profile"
                  width={32}
                  height={32}
                  unoptimized
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-4 h-4 text-orange-600" />
              )}
            </div>
            <span className="hidden sm:inline text-sm font-medium text-slate-700 max-w-28 truncate">
              {user?.fullName?.split(' ')[0] || 'Account'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isProfileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-100 py-2 z-45 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-900 truncate">{user?.fullName}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                {user?.role && user.role !== 'customer' && (
                  <div className="flex items-center gap-1.5 mt-2">
                    {getDashboardIcon()}
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                      {user.role}
                    </span>
                  </div>
                )}
              </div>

              {user?.role === 'customer' && (
                <>
                  <Link
                    href="/profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    My Profile
                  </Link>
                  <Link
                    href="/orders"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition"
                  >
                    <Package className="w-4 h-4 text-slate-400" />
                    Order History
                  </Link>
                </>
              )}

              {user?.role && user.role !== 'customer' && (
                <Link
                  href={`/${user.role}/dashboard`}
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 font-medium transition"
                >
                  <LayoutDashboard className="w-4 h-4 text-orange-500" />
                  Management Portal
                </Link>
              )}

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
                className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition font-medium"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 sm:gap-2">
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

      {/* Language */}
      <button
        className="hidden md:flex items-center gap-1 text-sm text-slate-500 px-2 py-2 rounded-xl hover:bg-slate-100 transition"
        title="Language: English"
      >
        <Globe className="w-4 h-4" />
        <span className="text-xs font-semibold">EN</span>
      </button>

      {/* Mobile Hamburger Toggle */}
      <button
        className="md:hidden p-2.5 rounded-xl hover:bg-slate-100 transition text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
      >
        {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
    </div>
  );

  // ========== RENDER MOBILE DRAWER (ALL CUSTOMER PAGES) ==========
  const renderMobileDrawer = (topOffsetClass: string) => {
    if (!isMobileMenuOpen) return null;

    return (
      <div
        ref={mobileMenuRef}
        className={`md:hidden fixed inset-x-0 ${topOffsetClass} bottom-0 bg-white z-40 overflow-y-auto border-t border-slate-100 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200`}
      >
        <div className="p-4 space-y-2">
          {/* Address selector button */}
          <button
            onClick={() => {
              setIsLocationModalOpen(true);
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 transition border border-slate-100 mb-2"
          >
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
              <MapPin className="w-5 h-5 text-orange-600" />
            </div>
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">
                {selectedAddress ? selectedAddress.area || selectedAddress.name : 'Choose location'}
              </p>
              <p className="text-xs text-slate-400 truncate">
                {selectedAddress ? selectedAddress.city : 'Tap to set delivery address'}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Guest welcome & authentication buttons in mobile drawer */}
          {!isAuthenticated && (
            <div className="p-3 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl border border-orange-100/80 mb-3">
              <p className="text-xs font-semibold text-orange-900 mb-1">Welcome to QuickBite</p>
              <p className="text-xs text-slate-500 mb-3">Sign in for saved addresses and fast checkout.</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openLoginModal();
                  }}
                  className="w-full py-2 bg-white text-orange-600 text-xs font-semibold rounded-xl border border-orange-200 hover:bg-orange-50 transition text-center shadow-sm"
                >
                  Log in
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openSignupModal();
                  }}
                  className="w-full py-2 bg-orange-500 text-white text-xs font-semibold rounded-xl hover:bg-orange-600 transition text-center shadow-sm shadow-orange-500/20"
                >
                  Sign up
                </button>
              </div>
            </div>
          )}

          {/* Cart item in mobile drawer (with live badge) */}
          {isCustomerOrGuest && (
            <Link
              href="/cart"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 text-slate-700 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4 text-orange-600" />
                </div>
                <span className="text-sm font-semibold text-slate-800">My Cart</span>
              </div>
              {isMounted && cartItemsCount > 0 && (
                <span className="min-w-5 h-5 px-1.5 bg-orange-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm shadow-orange-500/30">
                  {cartItemsCount > 99 ? '99+' : cartItemsCount}
                </span>
              )}
            </Link>
          )}

          {/* Favorites item in mobile drawer (with live badge) */}
          {isCustomerOrGuest && (
            <Link
              href="/favorites"
              onClick={(e) => {
                setIsMobileMenuOpen(false);
                if (!isAuthenticated) {
                  e.preventDefault();
                  toast('Please log in to view your favorite restaurants', { icon: '❤️' });
                  openLoginModal();
                }
              }}
              className="flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 text-slate-700 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-red-500" />
                </div>
                <span className="text-sm font-semibold text-slate-800">Favorites</span>
              </div>
              {isMounted && isAuthenticated && favoritesCount > 0 && (
                <span className="min-w-5 h-5 px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm shadow-red-500/30">
                  {favoritesCount > 9 ? '9+' : favoritesCount}
                </span>
              )}
            </Link>
          )}

          {/* Role links or guest customer links */}
          {isAuthenticated ? (
            roleBasedLinks
              .filter((link) => link.href !== '/favorites') // Avoid duplicating favorites
              .map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-slate-50 text-slate-700 transition"
                >
                  <link.icon className="w-5 h-5 text-slate-400" />
                  <span className="text-sm font-medium">{link.label}</span>
                </Link>
              ))
          ) : (
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-slate-50 text-slate-700 transition"
            >
              <Home className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium">Home</span>
            </Link>
          )}

          {/* Customer Profile Link */}
          {isAuthenticated && user?.role === 'customer' && (
            <Link
              href="/profile"
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-slate-50 text-slate-700 transition"
            >
              <User className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium">My Profile</span>
            </Link>
          )}

          {/* Staff portal shortcut if staff browsing customer view */}
          {isAuthenticated && user?.role && user.role !== 'customer' && (
            <Link
              href={`/${user.role}/dashboard`}
              onClick={() => setIsMobileMenuOpen(false)}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-orange-50 text-orange-700 transition font-medium"
            >
              <LayoutDashboard className="w-5 h-5 text-orange-500" />
              <span className="text-sm">Back to Management Portal</span>
            </Link>
          )}

          <Link
            href="/settings"
            onClick={() => setIsMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3.5 rounded-xl hover:bg-slate-50 text-slate-700 transition"
          >
            <Settings className="w-5 h-5 text-slate-400" />
            <span className="text-sm font-medium">Settings</span>
          </Link>

          {isAuthenticated && (
            <>
              <div className="my-2 border-t border-slate-100" />
              <button
                onClick={handleLogoutClick}
                className="flex items-center gap-3 w-full p-3.5 rounded-xl text-red-600 hover:bg-red-50 transition font-medium"
              >
                <LogOut className="w-5 h-5" />
                <span>Log out</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  // ========== DASHBOARD NAVBAR (ADMIN, OWNER, AGENT PORTALS) ==========
  if (isDashboardPage && user?.role) {
    const userRole = user?.role || 'admin';
    const dashboardPath = `/${userRole}/dashboard`;
    const portalTitle =
      userRole === 'admin'
        ? 'Admin Portal'
        : userRole === 'owner'
        ? 'Owner Portal'
        : userRole === 'agent'
        ? 'Agent Portal'
        : 'Dashboard';

    return (
      <>
        <LogoutModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={handleConfirmLogout}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authModalMode}
        />

        <nav className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <button
                onClick={() => router.push(dashboardPath)}
                className="flex items-center gap-2.5 hover:opacity-85 transition"
              >
                <Image
                  src="/logo.png"
                  alt="QuickBite"
                  width={36}
                  height={36}
                  className="w-9 h-9 object-contain"
                  priority
                />
                <div className="flex flex-col items-start">
                  <span className="text-lg font-bold text-orange-500 leading-tight tracking-tight">
                    QuickBite
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full -mt-0.5">
                    {portalTitle}
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-2">
                <NotificationDropdown />
                <div className="w-px h-6 bg-slate-200 mx-1" />

                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full hover:bg-slate-50 transition"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden ring-1 ring-orange-200">
                      {user?.profilePicture ? (
                        <Image
                          src={user.profilePicture}
                          alt="Profile"
                          width={32}
                          height={32}
                          unoptimized
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 text-orange-600" />
                      )}
                    </div>
                    <span className="hidden sm:inline text-sm font-medium text-slate-700">
                      {user?.fullName?.split(' ')[0] || 'User'}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </button>

                  {isProfileOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-45 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {user?.fullName || 'User'}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                        <div className="flex items-center gap-1.5 mt-2">
                          {getDashboardIcon()}
                          <span className="text-[11px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full capitalize font-medium">
                            {user?.role || 'admin'}
                          </span>
                        </div>
                      </div>

                      <div className="py-1">
                        <Link
                          href="/"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition"
                        >
                          <Home className="w-4 h-4 text-slate-400" />
                          Customer View
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition"
                        >
                          <Settings className="w-4 h-4 text-slate-400" />
                          Settings
                        </Link>
                      </div>

                      <div className="my-1 border-t border-slate-100" />

                      <button
                        onClick={handleLogoutClick}
                        className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Log out
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

  // ========== HOME PAGE NAVBAR (WITH SEARCH & DELIVERY TOGGLE ROW) ==========
  if (isHomePage) {
    return (
      <>
        <LocationModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
        />
        <LogoutModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={handleConfirmLogout}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode={authModalMode}
        />

        <nav className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4">
            {/* Top row */}
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5 shrink-0">
                <Image
                  src="/logo.png"
                  alt="QuickBite"
                  width={32}
                  height={32}
                  className="w-8 h-8 object-contain"
                  priority
                />
                <span className="text-xl font-bold text-orange-500 tracking-tight">QuickBite</span>
              </Link>

              {/* Location button */}
              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="hidden lg:flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-full border border-slate-200 transition text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                aria-label="Select delivery address"
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
              {renderRightActions()}
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
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                  </button>
                )}
              </form>
            </div>
          </div>
        </nav>

        {/* Mobile menu for home page */}
        {renderMobileDrawer('top-[116px] sm:top-[120px]')}
      </>
    );
  }

  // ========== DEFAULT & RESTAURANT PAGES NAVBAR ==========
  return (
    <>
      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
      <LogoutModal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        onConfirm={handleConfirmLogout}
      />
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      <nav className="bg-white/95 backdrop-blur-md border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <Image
                src="/logo.png"
                alt="QuickBite"
                width={32}
                height={32}
                className="w-8 h-8 object-contain"
                priority
              />
              <span className="text-xl font-bold text-orange-500 tracking-tight">QuickBite</span>
            </Link>

            {/* Desktop Navigation Links for Customer */}
            <div className="hidden md:flex items-center gap-1">
              {!isRestaurantPage &&
                roleBasedLinks.map((link) => (
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

            {/* Right actions (Consistent across all pages) */}
            {renderRightActions()}
          </div>
        </div>
      </nav>

      {/* Mobile drawer for restaurant and default customer pages */}
      {renderMobileDrawer('top-16')}
    </>
  );
}