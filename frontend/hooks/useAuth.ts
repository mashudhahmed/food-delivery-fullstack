'use client';

import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { auth, type AuthUser, type RegisterData } from '@/lib/auth';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const isMounted = useRef(true);
  const isInitialized = useRef(false);

  const checkAuth = useCallback(() => {
    try {
      const currentUser = auth.getCurrentUser();
      const authenticated = auth.isAuthenticated();

      if (isMounted.current) {
        setUser(currentUser);
        setIsAuthenticated(authenticated);
        setLoading(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      if (isMounted.current) {
        setUser(null);
        setIsAuthenticated(false);
        setLoading(false);
      }
    }
  }, []);

  // ✅ Use useLayoutEffect to avoid the ESLint warning
  useLayoutEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // ✅ Initialize auth state
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    
    // Initial auth check
    checkAuth();

    // Listen for auth changes
    const handleAuthChange = () => {
      checkAuth();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'token' || e.key === 'user') {
        checkAuth();
      }
    };

    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkAuth]);

  const login = useCallback(
    async (data: { email: string; password: string }) => {
      const result = await auth.login(data);
      checkAuth();
      return result;
    },
    [checkAuth],
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const result = await auth.register(data);
      checkAuth();
      return result;
    },
    [checkAuth],
  );

  const logout = useCallback(() => {
    auth.logout();
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    loading,
    isAuthenticated,
    login,
    register,
    logout,
    checkAuth,
  };
}

export default useAuth;


