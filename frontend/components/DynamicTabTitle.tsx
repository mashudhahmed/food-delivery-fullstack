'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const STATIC_ROUTE_TITLES: Record<string, string> = {
  '/': 'QuickBite - Food Delivery',
  '/cart': 'Your Cart | QuickBite',
  '/checkout': 'Checkout & Payment | QuickBite',
  '/orders': 'My Orders | QuickBite',
  '/favorites': 'Favorite Restaurants | QuickBite',
  '/notifications': 'Notifications | QuickBite',
  '/profile': 'My Profile | QuickBite',
  '/settings': 'Account Settings | QuickBite',
  '/login': 'Sign In | QuickBite',
  '/register': 'Create Account | QuickBite',
  '/reset-password': 'Reset Password | QuickBite',
  '/pending-approval': 'Application Pending Approval | QuickBite',

  // Admin Portal
  '/admin/dashboard': 'Admin Overview | QuickBite',
  '/admin/applications': 'Partner Applications | QuickBite',
  '/admin/users': 'User Management | QuickBite',
  '/admin/restaurants': 'Restaurants Directory | QuickBite',
  '/admin/orders': 'Platform Orders | QuickBite',
  '/admin/delivery-agents': 'Delivery Fleet | QuickBite',
  '/admin/analytics': 'Platform Analytics | QuickBite',
  '/admin/settings': 'System Settings | QuickBite',

  // Owner Portal
  '/owner/dashboard': 'Restaurant Dashboard | QuickBite',
  '/owner/menu': 'Menu Management | QuickBite',
  '/owner/orders': 'Incoming Orders | QuickBite',
  '/owner/restaurants': 'Restaurant Profile | QuickBite',
  '/owner/analytics': 'Business Analytics | QuickBite',

  // Delivery Agent Portal
  '/agent/dashboard': 'Rider Dashboard | QuickBite',
  '/agent/deliveries': 'Active Deliveries | QuickBite',
  '/agent/available': 'Available Orders | QuickBite',
  '/agent/earnings': 'My Earnings | QuickBite',
  '/agent/schedule': 'Delivery Schedule | QuickBite',
};

export default function DynamicTabTitle() {
  const pathname = usePathname();

  useEffect(() => {
    // Exact static match
    if (STATIC_ROUTE_TITLES[pathname]) {
      document.title = STATIC_ROUTE_TITLES[pathname];
      return;
    }

    // Dynamic prefix fallbacks (pages can override with specific entity names)
    if (pathname.startsWith('/restaurants/')) {
      document.title = 'Restaurant Details | QuickBite';
    } else if (pathname.startsWith('/orders/')) {
      document.title = 'Track Order | QuickBite';
    } else if (pathname.startsWith('/admin/')) {
      document.title = 'Admin Portal | QuickBite';
    } else if (pathname.startsWith('/owner/')) {
      document.title = 'Restaurant Partner | QuickBite';
    } else if (pathname.startsWith('/agent/')) {
      document.title = 'Delivery Partner | QuickBite';
    }
  }, [pathname]);

  return null;
}
