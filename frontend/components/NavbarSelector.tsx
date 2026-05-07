'use client';

import { usePathname } from 'next/navigation';
import HomeNavbar from './HomeNavbar';
import MainNavbar from './MainNavbar';
import RestaurantNavbar from './RestaurantNavbar';

export default function NavbarSelector() {
  const pathname = usePathname();
  
  // Check if we're on a restaurant detail page
  const isRestaurantPage = pathname?.startsWith('/restaurants/') && pathname !== '/restaurants';
  const isHomePage = pathname === '/';
  
  if (isHomePage) {
    return <HomeNavbar />;
  }
  
  if (isRestaurantPage) {
    return <RestaurantNavbar />;
  }
  
  return <MainNavbar />;
}