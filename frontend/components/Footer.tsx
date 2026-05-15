'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, Phone, MapPin, Globe, Apple, Smartphone } from 'lucide-react';
import { FaFacebook, FaTwitter, FaInstagram, FaYoutube } from 'react-icons/fa';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();
  
  // Check if on dashboard pages (admin, owner, agent)
  const isDashboardPage = pathname?.startsWith('/admin') || 
                          pathname?.startsWith('/owner') || 
                          pathname?.startsWith('/agent');
  
  // Check if on settings page
  const isSettingsPage = pathname === '/settings';
  
  // Check if on notifications page
  const isNotificationsPage = pathname === '/notifications';
  
  // Check if on auth pages (login/register)
  const isAuthPage = pathname === '/login' || pathname === '/register';
  
  // Check if on cart page
  const isCartPage = pathname === '/cart';
  
  // Check if on checkout page
  const isCheckoutPage = pathname === '/checkout';
  
  // Check if on orders page (customer orders)
  const isOrdersPage = pathname?.startsWith('/orders');
  
  // Check if on profile page
  const isProfilePage = pathname === '/profile';
  
  // Don't show footer on any of these pages
  const shouldHideFooter = isDashboardPage || 
                           isSettingsPage || 
                           isNotificationsPage || 
                           isAuthPage || 
                           isCartPage || 
                           isCheckoutPage || 
                           isOrdersPage || 
                           isProfilePage;
  
  if (shouldHideFooter) {
    return null;
  }

  return (
    <footer className="bg-gray-900 text-white mt-16">
      {/* Main Footer - Only for marketing/customer pages */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Column 1 - Brand & About */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="QuickBite Logo" className="w-10 h-10 object-contain bg-white rounded-full p-1" />
              <span className="text-2xl font-bold text-orange-500">QuickBite</span>
            </div>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              Delivering happiness to your doorstep. Order from the best restaurants in town with lightning-fast delivery.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
                <FaFacebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
                <FaTwitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
                <FaInstagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center hover:bg-orange-500 transition">
                <FaYoutube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Column 2 - Company */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Company</h3>
            <ul className="space-y-2">
              <li><Link href="/about" className="text-gray-400 hover:text-orange-500 transition text-sm">About Us</Link></li>
              <li><Link href="/careers" className="text-gray-400 hover:text-orange-500 transition text-sm">Careers</Link></li>
              <li><Link href="/blog" className="text-gray-400 hover:text-orange-500 transition text-sm">Blog</Link></li>
              <li><Link href="/press" className="text-gray-400 hover:text-orange-500 transition text-sm">Press</Link></li>
              <li><Link href="/investors" className="text-gray-400 hover:text-orange-500 transition text-sm">Investors</Link></li>
            </ul>
          </div>

          {/* Column 3 - Support */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Support</h3>
            <ul className="space-y-2">
              <li><Link href="/help" className="text-gray-400 hover:text-orange-500 transition text-sm">Help Center</Link></li>
              <li><Link href="/contact" className="text-gray-400 hover:text-orange-500 transition text-sm">Contact Us</Link></li>
              <li><Link href="/privacy" className="text-gray-400 hover:text-orange-500 transition text-sm">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-gray-400 hover:text-orange-500 transition text-sm">Terms of Service</Link></li>
              <li><Link href="/refund" className="text-gray-400 hover:text-orange-500 transition text-sm">Refund Policy</Link></li>
            </ul>
          </div>

          {/* Column 4 - Contact & App */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Get in Touch</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span>Dhaka, Bangladesh</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Phone className="w-4 h-4 text-orange-500" />
                <span>+880 1234 567890</span>
              </li>
              <li className="flex items-center gap-3 text-gray-400 text-sm">
                <Mail className="w-4 h-4 text-orange-500" />
                <span>support@quickbite.com</span>
              </li>
            </ul>
            
            {/* Download App */}
            <div className="mt-6">
              <h4 className="text-sm font-semibold mb-3">Download App</h4>
              <div className="flex gap-3">
                <a href="#" className="bg-gray-800 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition">
                  <Apple className="w-5 h-5" />
                  <div>
                    <div className="text-[10px] text-gray-400">App Store</div>
                    <div className="text-xs font-semibold">iOS</div>
                  </div>
                </a>
                <a href="#" className="bg-gray-800 px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-700 transition">
                  <Smartphone className="w-5 h-5" />
                  <div>
                    <div className="text-[10px] text-gray-400">Google Play</div>
                    <div className="text-xs font-semibold">Android</div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-800 mt-10 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <Globe className="w-4 h-4 text-gray-500" />
              <select className="bg-gray-800 text-white text-sm px-3 py-1 rounded-lg border border-gray-700 focus:outline-none focus:border-orange-500">
                <option>English (EN)</option>
                <option>বাংলা (BN)</option>
              </select>
            </div>
            <div className="text-gray-500 text-sm">
              © {currentYear} QuickBite. All rights reserved.
            </div>
            <div className="flex gap-4 text-sm">
              <Link href="/privacy" className="text-gray-500 hover:text-orange-500">Privacy</Link>
              <Link href="/terms" className="text-gray-500 hover:text-orange-500">Terms</Link>
              <Link href="/sitemap" className="text-gray-500 hover:text-orange-500">Sitemap</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}