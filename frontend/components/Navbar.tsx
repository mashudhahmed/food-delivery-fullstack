// components/Navbar.tsx
'use client';

import { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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
  Star,
  ArrowRight,
  Loader2,
  Utensils,
} from 'lucide-react';
import { auth } from '@/lib/auth';
import { api } from '@/lib/api';
import { Restaurant } from '@/types';
import { useCartStore } from '@/stores/cartStore';
import { useAddressStore } from '@/stores/addressStore';
import { useFavoritesStore } from '@/stores/favoritesStore';
import Image from 'next/image';
import toast from 'react-hot-toast';
import LocationModal from './LocationModal';
import LogoutModal from './LogoutModal';
import AuthModal from './AuthModal';
import { BiCycling } from 'react-icons/bi';

function SearchParamSync({ onQueryChange }: { onQueryChange: (q: string) => void }) {
  const searchParams = useSearchParams();
  const search = searchParams?.get('search') || '';
  useEffect(() => {
    onQueryChange(search);
  }, [search, onQueryChange]);
  return null;
}

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
  const [allRestaurants, setAllRestaurants] = useState<Restaurant[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearchingData, setIsSearchingData] = useState(false);
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

  // Close search suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-search-container="true"]')) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsProfileOpen(false);
        setShowSuggestions(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setShowSuggestions(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync searchTerm with URL query param on navigation
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('search');
      if (q) {
        setSearchTerm(q);
      } else if (pathname === '/') {
        setSearchTerm('');
      }
    }
  }, [pathname]);

  // Load restaurants in background for instant live autocomplete
  useEffect(() => {
    let cancelled = false;
    async function loadSearchRestaurants() {
      try {
        setIsSearchingData(true);
        const res = await api.get('/restaurants');
        const data = res.data;
        const list = Array.isArray(data) ? data : data?.data || data?.items || [];
        if (!cancelled) {
          setAllRestaurants(list);
        }
      } catch (err) {
        console.error('Failed to load restaurants for global search:', err);
      } finally {
        if (!cancelled) {
          setIsSearchingData(false);
        }
      }
    }
    loadSearchRestaurants();
    return () => {
      cancelled = true;
    };
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

  // Filter restaurants and cuisines for live search
  const searchResults = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return { restaurants: [], cuisines: [] };

    const matchingRestaurants = allRestaurants
      .filter(
        (r) =>
          r.name?.toLowerCase().includes(term) ||
          r.cuisineType?.toLowerCase().includes(term) ||
          r.description?.toLowerCase().includes(term)
      )
      .slice(0, 5);

    const POPULAR_CUISINES = [
      'Pizza',
      'Burger',
      'Biryani',
      'Indian',
      'Italian',
      'Chinese',
      'Thai',
      'Japanese',
      'American',
      'Cafe',
      'Desserts',
    ];

    const matchingCuisines = POPULAR_CUISINES.filter((c) =>
      c.toLowerCase().includes(term)
    ).slice(0, 4);

    return { restaurants: matchingRestaurants, cuisines: matchingCuisines };
  }, [searchTerm, allRestaurants]);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setShowSuggestions(false);
    setIsMobileMenuOpen(false);
    const clean = searchTerm.trim();
    if (clean) {
      router.push(`/?search=${encodeURIComponent(clean)}`);
    } else if (pathname === '/') {
      router.push('/');
    }
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setShowSuggestions(false);
    if (pathname === '/' && typeof window !== 'undefined' && window.location.search.includes('search')) {
      router.push('/');
    }
  };

  const handleSelectCuisine = (cuisineName: string) => {
    setSearchTerm(cuisineName);
    setShowSuggestions(false);
    setIsMobileMenuOpen(false);
    router.push(`/?search=${encodeURIComponent(cuisineName)}`);
  };

  const handleSelectRestaurant = (restaurantId: string) => {
    setShowSuggestions(false);
    setIsMobileMenuOpen(false);
    router.push(`/restaurants/${restaurantId}`);
  };

  const renderGlobalSearchBar = (
    containerClass: string = 'relative flex-1 w-full',
    isCompact: boolean = false
  ) => {
    return (
      <div data-search-container="true" className={`relative ${containerClass}`}>
        <form onSubmit={handleSearch} className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={!isCompact ? searchInputRef : undefined}
            type="text"
            placeholder={isCompact ? 'Search restaurants, cuisines...' : 'Search restaurants, cuisines... (⌘K)'}
            value={searchTerm}
            onFocus={() => setShowSuggestions(true)}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowSuggestions(true);
            }}
            className={`w-full pl-11 pr-10 rounded-full border border-slate-200 bg-slate-50/80 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/25 focus:border-orange-400 focus:bg-white transition ${
              isCompact ? 'py-2 text-xs' : 'py-2.5 text-sm'
            }`}
          />
          {isSearchingData && searchTerm && (
            <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-orange-500 pointer-events-none" />
          )}
          {searchTerm && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200/60 hover:bg-slate-300 flex items-center justify-center transition"
              aria-label="Clear search"
            >
              <X className="w-3 h-3 text-slate-600" />
            </button>
          )}
        </form>

        {/* Live Search Suggestions Dropdown */}
        {showSuggestions && (
          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 text-left animate-in fade-in-50 zoom-in-95 duration-150 max-h-[75vh] overflow-y-auto divide-y divide-slate-100">
            {searchTerm.trim().length === 0 ? (
              /* Quick Suggestions when empty */
              <div className="p-4">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  Popular Searches
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Pizza', 'Burger', 'Biryani', 'Indian', 'Italian', 'Cafe'].map((cuisine) => (
                    <button
                      key={cuisine}
                      type="button"
                      onClick={() => handleSelectCuisine(cuisine)}
                      className="px-3 py-1.5 rounded-full bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-xs font-medium text-slate-700 transition"
                    >
                      {cuisine}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Matching Cuisines */}
                {searchResults.cuisines.length > 0 && (
                  <div className="p-3 bg-slate-50/70">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1 flex items-center gap-1.5">
                      <Utensils className="w-3 h-3 text-orange-500" />
                      Cuisines
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {searchResults.cuisines.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => handleSelectCuisine(c)}
                          className="px-3 py-1 rounded-full bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-600 text-xs font-medium text-slate-700 transition shadow-2xs"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Matching Restaurants */}
                {searchResults.restaurants.length > 0 ? (
                  <div className="p-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 px-2 pt-1 flex items-center gap-1.5">
                      <Store className="w-3 h-3 text-orange-500" />
                      Restaurants
                    </p>
                    <div className="space-y-0.5">
                      {searchResults.restaurants.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleSelectRestaurant(r.id)}
                          className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-orange-50/60 text-left transition group"
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden relative shrink-0">
                            {r.imageUrl ? (
                              <Image
                                src={r.imageUrl}
                                alt={r.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-orange-100 text-orange-600 font-bold text-sm">
                                {r.name.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 group-hover:text-orange-600 transition truncate">
                              {r.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                              <span className="truncate">{r.cuisineType}</span>
                              {Number(r.rating) > 0 && (
                                <span className="flex items-center gap-0.5 text-amber-600 font-medium">
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  {Number(r.rating).toFixed(1)}
                                </span>
                              )}
                              {!r.isOpen && (
                                <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded text-slate-500">
                                  Closed
                                </span>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 group-hover:translate-x-0.5 transition shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : searchResults.cuisines.length === 0 ? (
                  <div className="p-6 text-center">
                    <Search className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700">
                      No matches found for &ldquo;{searchTerm}&rdquo;
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Press Enter to search all restaurants on the main page.
                    </p>
                  </div>
                ) : null}

                {/* Submit button */}
                <button
                  type="button"
                  onClick={() => handleSearch()}
                  className="w-full p-3 bg-slate-50 hover:bg-orange-50 hover:text-orange-600 text-xs font-semibold text-slate-600 flex items-center justify-center gap-2 transition"
                >
                  <span>See all results for &ldquo;{searchTerm}&rdquo;</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
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
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-100 py-2 z-45 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden ring-2 ring-orange-200 shrink-0">
                  {user?.profilePicture ? (
                    <Image
                      src={user.profilePicture}
                      alt="Profile"
                      width={40}
                      height={40}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-bold text-orange-600">
                      {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{user?.fullName || 'User'}</p>
                  <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  {user?.role && user.role !== 'customer' && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {getDashboardIcon()}
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                        {user.role}
                      </span>
                    </div>
                  )}
                </div>
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

      {/* 3-line Mobile Hamburger Toggle */}
      <button
        className="md:hidden p-2 sm:p-2.5 rounded-xl hover:bg-slate-100 active:bg-slate-200 transition text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/40 shrink-0"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
        title="Menu"
      >
        {isMobileMenuOpen ? (
          <X className="w-5 h-5 text-slate-800 transition-transform duration-200 rotate-90 animate-in spin-in-90" />
        ) : (
          <Menu className="w-5 h-5 text-slate-800 transition-transform duration-200" />
        )}
      </button>
    </div>
  );

  // ========== RENDER MOBILE DRAWER (ALL CUSTOMER PAGES) ==========
  const renderMobileDrawer = (topOffsetClass: string) => {
    if (!isMobileMenuOpen) return null;

    return (
      <div
        ref={mobileMenuRef}
        className={`md:hidden fixed inset-x-0 ${topOffsetClass} bottom-0 bg-white/98 backdrop-blur-xl z-40 overflow-y-auto border-t border-slate-100 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200`}
      >
        <div className="max-w-lg mx-auto p-4 space-y-3.5 pb-10">
          {/* 1. Address selector card */}
          <button
            onClick={() => {
              setIsLocationModalOpen(true);
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 hover:bg-orange-50/50 border border-slate-200/80 hover:border-orange-200 transition text-left group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <MapPin className="w-5 h-5 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Delivering to
                </p>
                <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-orange-600 transition">
                  {selectedAddress ? selectedAddress.area || selectedAddress.name : 'Choose location'}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {selectedAddress ? selectedAddress.city : 'Tap to set delivery address'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0 pl-2">
              <span className="text-xs font-semibold text-orange-600 bg-white px-2.5 py-1 rounded-full border border-orange-100 shadow-2xs">
                Change
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </button>

          {/* 2. User profile card or Guest auth card */}
          {!isAuthenticated ? (
            <div className="p-4 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 rounded-2xl border border-orange-100/90 shadow-2xs">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-6 h-6 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-xs">
                  QB
                </div>
                <p className="text-sm font-bold text-slate-900">Welcome to QuickBite</p>
              </div>
              <p className="text-xs text-slate-500 mb-3.5">
                Sign in for saved addresses, order tracking, and fast checkout.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openLoginModal();
                  }}
                  className="w-full py-2.5 bg-white text-orange-600 text-xs font-bold rounded-xl border border-orange-200 hover:bg-orange-50 active:scale-98 transition text-center shadow-xs"
                >
                  Log in
                </button>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    openSignupModal();
                  }}
                  className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 active:scale-98 text-white text-xs font-bold rounded-xl transition text-center shadow-sm shadow-orange-500/25"
                >
                  Sign up
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-gradient-to-r from-orange-50/90 to-amber-50/90 rounded-2xl border border-orange-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden ring-2 ring-orange-200 shrink-0">
                  {user?.profilePicture ? (
                    <Image
                      src={user.profilePicture}
                      alt="Profile"
                      width={44}
                      height={44}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-base font-bold text-orange-600">
                      {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {user?.fullName || 'User'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                  {user?.role && (
                    <span className="inline-block mt-1 text-[10px] uppercase font-bold tracking-wider bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200/50">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>
              <Link
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-xs font-semibold text-orange-600 bg-white px-3 py-1.5 rounded-full border border-orange-200 hover:bg-orange-50 transition shrink-0 shadow-2xs"
              >
                Profile
              </Link>
            </div>
          )}

          {/* 3. Quick Cart & Favorites 2-Col Grid */}
          {isCustomerOrGuest && (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/cart"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-orange-50/60 border border-slate-200/70 transition group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-orange-100/80 flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">My Cart</p>
                    <p className="text-[11px] text-slate-400">
                      {isMounted && cartItemsCount > 0 ? `${cartItemsCount} item${cartItemsCount === 1 ? '' : 's'}` : 'Empty'}
                    </p>
                  </div>
                </div>
                {isMounted && cartItemsCount > 0 && (
                  <span className="min-w-5 h-5 px-1.5 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {cartItemsCount > 99 ? '99+' : cartItemsCount}
                  </span>
                )}
              </Link>

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
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-red-50/60 border border-slate-200/70 transition group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-red-100/80 flex items-center justify-center shrink-0">
                    <Heart className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">Favorites</p>
                    <p className="text-[11px] text-slate-400">
                      {isMounted && isAuthenticated && favoritesCount > 0 ? `${favoritesCount} saved` : 'Saved'}
                    </p>
                  </div>
                </div>
                {isMounted && isAuthenticated && favoritesCount > 0 && (
                  <span className="min-w-5 h-5 px-1.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                    {favoritesCount > 9 ? '9+' : favoritesCount}
                  </span>
                )}
              </Link>
            </div>
          )}

          {/* 4. Discover & Orders Section */}
          <div className="space-y-1 pt-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pb-1">
              Discover & Orders
            </p>
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
                pathname === '/'
                  ? 'bg-orange-50 text-orange-600 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50 font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Home className={`w-4 h-4 ${pathname === '/' ? 'text-orange-600' : 'text-slate-500'}`} />
                </div>
                <span className="text-sm">Home</span>
              </div>
              <ChevronDown className="w-4 h-4 -rotate-90 text-slate-300" />
            </Link>

            {isCustomerOrGuest && (
              <Link
                href="/orders"
                onClick={(e) => {
                  setIsMobileMenuOpen(false);
                  if (!isAuthenticated) {
                    e.preventDefault();
                    toast('Please log in to view order history', { icon: '📦' });
                    openLoginModal();
                  }
                }}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
                  pathname === '/orders'
                    ? 'bg-orange-50 text-orange-600 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Package className={`w-4 h-4 ${pathname === '/orders' ? 'text-orange-600' : 'text-slate-500'}`} />
                  </div>
                  <span className="text-sm">Order History</span>
                </div>
                <ChevronDown className="w-4 h-4 -rotate-90 text-slate-300" />
              </Link>
            )}

            {/* Staff portal shortcut if applicable */}
            {isAuthenticated && user?.role && user.role !== 'customer' && (
              <Link
                href={`/${user.role}/dashboard`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-orange-50 text-orange-700 font-semibold transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                    <LayoutDashboard className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className="text-sm">Management Portal</span>
                </div>
                <ChevronDown className="w-4 h-4 -rotate-90 text-orange-400" />
              </Link>
            )}
          </div>

          {/* 5. Account & Settings Section */}
          <div className="space-y-1 pt-1 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-2 pb-1">
              Account & Settings
            </p>
            {isAuthenticated && user?.role === 'customer' && (
              <Link
                href="/profile"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
                  pathname === '/profile'
                    ? 'bg-orange-50 text-orange-600 font-semibold'
                    : 'text-slate-700 hover:bg-slate-50 font-medium'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <User className={`w-4 h-4 ${pathname === '/profile' ? 'text-orange-600' : 'text-slate-500'}`} />
                  </div>
                  <span className="text-sm">My Profile</span>
                </div>
                <ChevronDown className="w-4 h-4 -rotate-90 text-slate-300" />
              </Link>
            )}

            <Link
              href="/settings"
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
                pathname === '/settings'
                  ? 'bg-orange-50 text-orange-600 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50 font-medium'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Settings className={`w-4 h-4 ${pathname === '/settings' ? 'text-orange-600' : 'text-slate-500'}`} />
                </div>
                <span className="text-sm">Settings</span>
              </div>
              <ChevronDown className="w-4 h-4 -rotate-90 text-slate-300" />
            </Link>
          </div>

          {/* 6. Session & App Footer */}
          {isAuthenticated && (
            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={handleLogoutClick}
                className="flex items-center gap-3 w-full p-3.5 rounded-xl text-red-600 hover:bg-red-50 active:bg-red-100 transition font-semibold text-sm"
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                  <LogOut className="w-4 h-4" />
                </div>
                <span>Log out</span>
              </button>
            </div>
          )}

          {/* App Footer */}
          <div className="pt-3 pb-1 text-center text-xs text-slate-400">
            <p className="font-semibold text-slate-600">QuickBite</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Fast delivery, great taste</p>
          </div>
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
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-45 animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden ring-2 ring-orange-200 shrink-0">
                          {user?.profilePicture ? (
                            <Image
                              src={user.profilePicture}
                              alt="Profile"
                              width={40}
                              height={40}
                              unoptimized
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-orange-600">
                              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {user?.fullName || 'User'}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                          <div className="flex items-center gap-1.5 mt-1.5">
                            {getDashboardIcon()}
                            <span className="text-[10px] uppercase font-bold tracking-wider bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full">
                              {user?.role || 'admin'}
                            </span>
                          </div>
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

  // ========== UNIFIED CUSTOMER NAVBAR (ALL STOREFRONT & RESTAURANT PAGES) ==========
  return (
    <>
      <Suspense fallback={null}>
        <SearchParamSync onQueryChange={setSearchTerm} />
      </Suspense>
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
          {/* Main header row (64px) */}
          <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
            {/* Left: Brand Logo & Location Pill */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
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
                className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full border border-slate-200 transition text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 max-w-36 sm:max-w-none shrink-0"
                aria-label="Select delivery address"
              >
                <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500 shrink-0" />
                <span className="font-medium text-slate-700 truncate max-w-20 sm:max-w-28 md:max-w-36">
                  {selectedAddress ? selectedAddress.area || selectedAddress.name : 'Location'}
                </span>
                <span className="text-slate-400 max-w-24 truncate hidden xl:inline">
                  {selectedAddress ? selectedAddress.city : 'Select'}
                </span>
                <ChevronDown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 shrink-0" />
              </button>
            </div>

            {/* Center: Global Search Bar (Tablet & Desktop: sm+) */}
            <div className="hidden sm:block flex-1 max-w-xs md:max-w-md lg:max-w-xl mx-2 md:mx-4">
              {renderGlobalSearchBar('w-full', false)}
            </div>

            {/* Desktop Navigation Links (Visible on extra-wide screens) */}
            <div className="hidden 2xl:flex items-center gap-1">
              {!isRestaurantPage &&
                roleBasedLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition ${
                      pathname === link.href
                        ? 'text-orange-600 bg-orange-50'
                        : 'text-slate-600 hover:text-orange-600 hover:bg-slate-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
            </div>

            {/* Right: Actions (Favorites, Cart, Account, Hamburger) */}
            {renderRightActions()}
          </div>

          {/* Mobile Search Row (< sm screens only) */}
          <div className="sm:hidden pb-2.5 pt-0.5">
            {renderGlobalSearchBar('w-full', true)}
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {renderMobileDrawer('top-[106px] sm:top-16')}
    </>
  );
}