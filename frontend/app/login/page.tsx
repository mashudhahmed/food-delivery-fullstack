// app/login/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/auth';
import AuthModal from '@/components/AuthModal';

export default function LoginPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(true);
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

  if (!checked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <>
      <AuthModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          router.push('/');
        }}
        initialMode="login"
      />
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500">Opening login modal...</p>
        </div>
      </div>
    </>
  );
}