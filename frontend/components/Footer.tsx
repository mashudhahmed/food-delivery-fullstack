// components/Footer.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, Phone, MapPin, Globe, Apple, Smartphone } from 'lucide-react';
import { FaFacebook, FaTwitter, FaInstagram, FaYoutube } from 'react-icons/fa';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();

  const isDashboardPage =
    pathname?.startsWith('/admin') ||
    pathname?.startsWith('/owner') ||
    pathname?.startsWith('/agent');
  const isSettingsPage = pathname === '/settings';
  const isNotificationsPage = pathname === '/notifications';
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isCartPage = pathname === '/cart';
  const isCheckoutPage = pathname === '/checkout';
  const isOrdersPage = pathname?.startsWith('/orders');
  const isProfilePage = pathname === '/profile';

  const shouldHideFooter =
    isDashboardPage ||
    isSettingsPage ||
    isNotificationsPage ||
    isAuthPage ||
    isCartPage ||
    isCheckoutPage ||
    isOrdersPage ||
    isProfilePage;

  if (shouldHideFooter) return null;

  return (
    <footer className="bg-slate-950 text-white mt-20">
      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center p-1.5">
                <img
                  src="/logo.png"
                  alt="QuickBite"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-orange-500 tracking-tight">
                QuickBite
              </span>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-6 max-w-xs">
              Delivering happiness to your doorstep. Order from the best
              restaurants with lightning-fast delivery.
            </p>
            <div className="flex gap-2.5">
              {[
                { Icon: FaFacebook, href: '#' },
                { Icon: FaTwitter, href: '#' },
                { Icon: FaInstagram, href: '#' },
                { Icon: FaYoutube, href: '#' },
              ].map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-orange-500 flex items-center justify-center transition-colors"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 tracking-wide">
              Company
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: 'About Us', href: '/about' },
                { label: 'Careers', href: '/careers' },
                { label: 'Blog', href: '/blog' },
                { label: 'Press', href: '/press' },
                { label: 'Investors', href: '/investors' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-orange-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 tracking-wide">
              Support
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: 'Help Center', href: '/help' },
                { label: 'Contact Us', href: '/contact' },
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
                { label: 'Refund Policy', href: '/refund' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-orange-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact + App */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4 tracking-wide">
              Get in touch
            </h3>
            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-2.5 text-sm text-slate-400">
                <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                Dhaka, Bangladesh
              </li>
              <li className="flex items-center gap-2.5 text-sm text-slate-400">
                <Phone className="w-4 h-4 text-orange-500 shrink-0" />
                +880 1234 567890
              </li>
              <li className="flex items-center gap-2.5 text-sm text-slate-400">
                <Mail className="w-4 h-4 text-orange-500 shrink-0" />
                support@quickbite.com
              </li>
            </ul>

            <p className="text-xs font-medium text-slate-500 mb-3">
              Download the app
            </p>
            <div className="flex gap-2.5">
              <a
                href="#"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/5"
              >
                <Apple className="w-5 h-5" />
                <div>
                  <div className="text-[10px] text-slate-500 leading-none">
                    App Store
                  </div>
                  <div className="text-xs font-semibold leading-tight mt-0.5">
                    iOS
                  </div>
                </div>
              </a>
              <a
                href="#"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition border border-white/5"
              >
                <Smartphone className="w-5 h-5" />
                <div>
                  <div className="text-[10px] text-slate-500 leading-none">
                    Google Play
                  </div>
                  <div className="text-xs font-semibold leading-tight mt-0.5">
                    Android
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Globe className="w-3.5 h-3.5 text-slate-500" />
            <select className="bg-transparent text-sm text-slate-400 border-none focus:outline-none cursor-pointer">
              <option className="bg-slate-900">English (EN)</option>
              <option className="bg-slate-900">বাংলা (BN)</option>
            </select>
          </div>

          <p className="text-sm text-slate-500">
            © {currentYear} QuickBite. All rights reserved.
          </p>

          <div className="flex gap-5 text-sm">
            <Link
              href="/privacy"
              className="text-slate-500 hover:text-orange-400 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-slate-500 hover:text-orange-400 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/sitemap"
              className="text-slate-500 hover:text-orange-400 transition-colors"
            >
              Sitemap
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}