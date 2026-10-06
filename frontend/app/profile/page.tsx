// frontend/app/profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import { User, Mail, Phone, MapPin, Calendar, Shield, Edit2, Camera } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface User {
  id?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  role?: string;
  profilePicture?: string;
  createdAt?: string;
  lastLogin?: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadUser = () => {
      const authenticated = auth.isAuthenticated();

      if (!authenticated) {
        if (!cancelled) {
          setLoading(false);
        }
        router.replace('/');
        return;
      }

      const currentUser = auth.getCurrentUser();

      if (!cancelled) {
        setUser(currentUser);
        setLoading(false);
      }
    };

    // Defer the state updates so they are not seen as synchronous setState in effect
    queueMicrotask(loadUser);

    const handleAuthChange = () => {
      if (!cancelled) {
        const updated = auth.getCurrentUser();
        setUser(updated);
      }
    };

    window.addEventListener('auth-change', handleAuthChange);

    return () => {
      cancelled = true;
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
      </div>
    );
  }

  // Format date helper
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1">View your account details and activity</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - User Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              {/* Avatar */}
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4 group">
                  <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center overflow-hidden ring-4 ring-orange-100 shadow-sm">
                    {user?.profilePicture ? (
                      <Image
                        src={user.profilePicture}
                        alt={user.fullName || 'Profile'}
                        width={96}
                        height={96}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-orange-600">
                        {user?.fullName?.charAt(0).toUpperCase() || 'U'}
                      </span>
                    )}
                  </div>
                  <Link
                    href="/settings?tab=profile"
                    className="absolute bottom-0 right-0 p-2 bg-orange-500 text-white rounded-full shadow-md hover:bg-orange-600 transition ring-2 ring-white"
                    title="Change Photo"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {user?.fullName || 'User'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{user?.email}</p>
                <div className="mt-3">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-100">
                    <Shield className="w-3 h-3 mr-1" />
                    {user?.role || 'customer'}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-2">
                <Link
                  href="/settings"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 transition"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Personal Information</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Full Name</p>
                    <p className="text-gray-800">{user?.fullName || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Email Address</p>
                    <p className="text-gray-800">{user?.email || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Phone Number</p>
                    <p className="text-gray-800">{user?.phone || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Address</p>
                    <p className="text-gray-800">{user?.address || '—'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Activity */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">Account Activity</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Member Since</p>
                    <p className="text-gray-800">{formatDate(user?.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Last Login</p>
                    <p className="text-gray-800">{formatDate(user?.lastLogin)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}