// lib/auth.ts
import api from './api';
import { storage, STORAGE_KEYS } from './storage';
import { logError } from './error-handler';
import { disconnectSocket } from './websocket';

export interface AuthUser {
  id: string;
  name?: string;
  fullName?: string;
  email: string;
  role: 'customer' | 'owner' | 'agent' | 'admin';
  status?: string;
  phone?: string;
  avatar?: string;
  profilePicture?: string;
  address?: string;
}

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  expiresIn?: number;
  user: AuthUser;
  requiresApproval?: boolean;
  requiresTwoFactor?: boolean;
  tempToken?: string;
  message?: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: 'customer' | 'owner' | 'agent';
  address?: string;
  businessName?: string;
  businessAddress?: string;
  taxId?: string;
  nidNumber?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  drivingLicense?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export const auth = {
  // ✅ Login with 2FA support
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const { data } = await api.post('/auth/login', credentials);
    
    // Unwrap the standard backend interceptor wrapper
    const result = data.success ? data.data : data;

    const accessToken = result.accessToken || result.token;
    const refreshToken = result.refreshToken;
    const user = result.user;
    const requiresTwoFactor = result.requiresTwoFactor || false;
    const tempToken = result.tempToken;

    if (accessToken && !requiresTwoFactor) {
      storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (typeof window !== 'undefined') localStorage.setItem('token', accessToken);
    }
    if (refreshToken && !requiresTwoFactor) {
      storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    if (user && !requiresTwoFactor) {
      storage.setItem(STORAGE_KEYS.USER, user);
      if (typeof window !== 'undefined') localStorage.setItem('user', JSON.stringify(user));
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'));
    }

    return {
      accessToken,
      refreshToken,
      token: accessToken,
      user,
      requiresTwoFactor,
      tempToken,
    };
  },

  // ✅ Register with unwrapping
  async register(data: RegisterData): Promise<AuthResponse> {
    try {
      const response = await api.post('/auth/register', data);
      
      let result = response.data;
      if (result?.success === true && result?.data) {
        result = result.data;
      }

      const user = result?.user;
      const accessToken = result.accessToken || result.token;
      const requiresApproval = result.requiresApproval || false;

      if (user) {
        storage.setItem(STORAGE_KEYS.USER, user);
        if (typeof window !== 'undefined') localStorage.setItem('user', JSON.stringify(user));
      }
      if (accessToken) {
        storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
        if (typeof window !== 'undefined') localStorage.setItem('token', accessToken);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-change'));
      }

      return {
        user,
        accessToken,
        token: accessToken,
        requiresApproval,
        message: result.message || 'Registration successful',
      };
    } catch (error: unknown) {
      logError(error, 'auth.register');
      
      // ✅ FIX: Re-throw the original error instead of creating a new string
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = storage.getItem<string>(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // Swallow error, we are logging out anyway
    } finally {
      disconnectSocket();
      storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      storage.removeItem(STORAGE_KEYS.USER);

      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
      window.dispatchEvent(new Event('auth-change'));
    }
  },

  // ✅ NEW: Get current user from storage
  getCurrentUser(): AuthUser | null {
    return storage.getItem<AuthUser>(STORAGE_KEYS.USER);
  },

  // ✅ NEW: Update current user and broadcast changes globally
  updateCurrentUser(partialUser: Partial<AuthUser>): AuthUser | null {
    const current = this.getCurrentUser();
    if (!current) return null;
    const updated = { ...current, ...partialUser };
    storage.setItem(STORAGE_KEYS.USER, updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(updated));
      window.dispatchEvent(new Event('auth-change'));
    }
    return updated;
  },

  getToken(): string | null {
    return storage.getItem<string>(STORAGE_KEYS.ACCESS_TOKEN) || 
           (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  },

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getCurrentUser();
  },
};

// Exports for use elsewhere
export type { AuthUser as default };