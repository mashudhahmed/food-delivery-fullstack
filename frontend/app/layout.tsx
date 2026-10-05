// app/layout.tsx
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import NotificationInitializer from '@/components/NotificationInitializer';
import DynamicTabTitle from '@/components/DynamicTabTitle';
import ErrorBoundary from '@/components/ErrorBoundary';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#ea580c',
};

export const metadata: Metadata = {
  title: {
    default: 'QuickBite - Food Delivery',
    template: '%s | QuickBite',
  },
  description: 'Order food from your favorite restaurants. Fast delivery, great taste.',
  keywords: 'food delivery, restaurant, order food, quickbite, delivery app',
  openGraph: {
    title: 'QuickBite - Food Delivery',
    description: 'Order food from your favorite restaurants',
    images: [
      {
        url: 'https://quickbite.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'QuickBite Food Delivery',
      },
    ],
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'QuickBite - Food Delivery',
    description: 'Order food from your favorite restaurants',
    images: ['https://quickbite.com/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://quickbite.com',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} antialiased`}>
        {/* ✅ ErrorBoundary properly wraps everything */}
        <ErrorBoundary>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:p-4 focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            Skip to main content
          </a>
          <DynamicTabTitle />
          <NotificationInitializer />
          <Navbar />
          <main id="main-content" className="min-h-screen" role="main">
            {children}
          </main>
          <Footer />
          <Toaster 
            position="top-right"
            gutter={8}
            toastOptions={{
              duration: 4000,
              style: {
                background: '#ffffff',
                color: '#1e293b',
                borderRadius: '1rem',
                border: '1px solid #f1f5f9',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
                padding: '12px 16px',
                fontSize: '14px',
                fontWeight: 500,
              },
              success: {
                duration: 3500,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#ffffff',
                },
              },
              error: {
                duration: 4500,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </ErrorBoundary>
      </body>
    </html>
  );
}