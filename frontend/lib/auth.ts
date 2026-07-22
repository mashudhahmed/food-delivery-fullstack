// lib/auth.ts
import { api } from './api';
import { storage } from './storage';
import { User } from '../types';

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  address?: string;
  role?: string;
  businessName?: string;
  businessAddress?: string;
  taxId?: string;
  nidNumber?: string;
  vehicleType?: string;
  vehicleNumber?: string;
  drivingLicense?: string;
}

// Storage keys as constants
const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
} as const;

export const auth = {
  async login(data: LoginData) {
    try {
      const response = await api.post('/auth/login', data);
      
      // ✅ Log the full response to see the structure
      console.log('🔵 Full login response:', response.data);
      
      // ✅ Handle different response structures
      let token: string;
      let user: User;
      
      // Check if response.data has the data directly or nested
      if (response.data.token && response.data.user) {
        // Response is { token, user }
        token = response.data.token;
        user = response.data.user;
      } else if (response.data.data && response.data.data.token) {
        // Response is { data: { token, user } }
        token = response.data.data.token;
        user = response.data.data.user;
      } else if (response.data.token) {
        // Response has token but user might be nested differently
        token = response.data.token;
        user = response.data.user || response.data.data?.user || null;
      } else {
        throw new Error('Invalid login response structure');
      }
      
      if (!user) {
        console.error('❌ No user found in response:', response.data);
        throw new Error('User data not found in response');
      }
      
      console.log('✅ Token extracted:', !!token);
      console.log('✅ User extracted:', !!user);
      console.log('✅ User role:', user.role);
      
      // Use safe storage
      storage.setItem(STORAGE_KEYS.TOKEN, token);
      storage.setItem(STORAGE_KEYS.USER, user);
      
      console.log('✅ Login successful - Token stored:', !!storage.getItem('token'));
      console.log('✅ Login successful - User stored:', !!storage.getItem('user'));
      
      return { token, user };
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  },

  async register(data: RegisterData) {
    try {
      const response = await api.post('/auth/register', data);
      
      // ✅ Log the full response to see the structure
      console.log('🔵 Full register response:', response.data);
      
      let token: string;
      let user: User;
      
      if (response.data.token && response.data.user) {
        token = response.data.token;
        user = response.data.user;
      } else if (response.data.data && response.data.data.token) {
        token = response.data.data.token;
        user = response.data.data.user;
      } else {
        throw new Error('Invalid register response structure');
      }
      
      storage.setItem(STORAGE_KEYS.TOKEN, token);
      storage.setItem(STORAGE_KEYS.USER, user);
      
      return { token, user };
    } catch (error) {
      console.error('❌ Register error:', error);
      throw error;
    }
  },

  logout() {
    storage.removeItem(STORAGE_KEYS.TOKEN);
    storage.removeItem(STORAGE_KEYS.USER);
    
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'));
      window.location.href = '/login';
    }
  },

  getCurrentUser(): User | null {
    const user = storage.getItem<User>(STORAGE_KEYS.USER);
    console.log('🔵 getCurrentUser:', !!user);
    return user;
  },

  getToken(): string | null {
    const token = storage.getItem<string>(STORAGE_KEYS.TOKEN);
    console.log('🔵 getToken:', !!token);
    return token;
  },

  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();
    const isAuth = !!(token && user);
    console.log('🔵 isAuthenticated:', isAuth);
    return isAuth;
  },

  clearAuthData(): void {
    storage.removeMultiple([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
  },

  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  },
};

export default auth;