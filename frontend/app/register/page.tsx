// app/register/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';

export default function RegisterPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  // 1. Check authentication status
  useEffect(() => {
    if (auth.isAuthenticated()) {
      const user = auth.getCurrentUser();
      const redirectMap: Record<string, string> = {
        admin: '/admin/dashboard',
        owner: '/owner/dashboard',
        agent: '/agent/dashboard',
      };
      const redirectPath = redirectMap[user?.role || 'customer'] || '/';
      router.replace(redirectPath);
      return;
    }

    // Defer setState so it is not treated as synchronous setState-in-effect
    queueMicrotask(() => setChecked(true));
  }, [router]);

  // 2. Once checked and user is NOT authenticated → open register modal
  useEffect(() => {
    if (!checked) return;

    localStorage.setItem('openAuthModal', 'register');
    router.replace('/');
  }, [checked, router]);

  // Loading spinner while we decide
  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-500">Redirecting to signup...</p>
      </div>
    </div>
  );
}