// frontend/app/register/page.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
  const router = useRouter();
  
  useEffect(() => {
    // Store that user tried to access register page
    localStorage.setItem('openAuthModal', 'register');
    router.push('/');
  }, [router]);
  
  return null;
}