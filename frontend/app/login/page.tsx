// app/login/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Check if user is already authenticated
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
    setChecked(true);
  }, [router]);

  useEffect(() => {
    if (!checked) return;

    localStorage.setItem('openAuthModal', 'login');
    router.replace('/');
  }, [checked, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500" />
    </div>
  );
}