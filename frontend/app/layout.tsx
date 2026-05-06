import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import HomeNavbar from '@/components/HomeNavbar';
import MainNavbar from '@/components/MainNavbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'foodpanda - Food Delivery',
  description: 'Order food from your favorite restaurants',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <HomeNavbar />
        <MainNavbar />
        <main>{children}</main>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}