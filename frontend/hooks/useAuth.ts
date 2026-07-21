'use client';

import { useState, useEffect, useCallback } from 'react';
import { auth } from '@/lib/auth';
import { User } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = useCallback(() => {
    try {
      const currentUser = auth.getCurrentUser();
      const authenticated = auth.isAuthenticated();
      
      setUser(currentUser);
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('auth-change', handleAuthChange);
    window.addEventListener('storage', (e) => {
      if (e.key === 'token' || e.key === 'user') {
        checkAuth();
      }
    });

    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [checkAuth]);

  const login = useCallback(async (data: { email: string; password: string }) => {
    const result = await auth.login(data);
    checkAuth();
    return result;
  }, [checkAuth]);

  const register = useCallback(async (data: any) => {
    const result = await auth.register(data);
    checkAuth();
    return result;
  }, [checkAuth]);

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