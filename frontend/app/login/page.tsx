'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthModal } from '@/hooks/useAuthModal';
import AuthModal from '@/components/AuthModal';

export default function LoginPage() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(true);
  
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
      {/* Fallback content (optional) */}
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Redirecting...</p>
        </div>
      </div>
    </>
  );
}