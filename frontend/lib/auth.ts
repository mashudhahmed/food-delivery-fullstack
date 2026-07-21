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
}

// Storage keys as constants
const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
} as const;

export const auth = {
  async login(data: LoginData) {
    const response = await api.post('/auth/login', data);
    const { token, user } = response.data;
    
    // Use safe storage
    storage.setItem(STORAGE_KEYS.TOKEN, token);
    storage.setItem(STORAGE_KEYS.USER, user);
    
    return { token, user };
  },

  async register(data: RegisterData) {
    const response = await api.post('/auth/register', data);
    const { token, user } = response.data;
    
    // Use safe storage
    storage.setItem(STORAGE_KEYS.TOKEN, token);
    storage.setItem(STORAGE_KEYS.USER, user);
    
    return { token, user };
  },

  logout() {
    // Use safe storage
    storage.removeItem(STORAGE_KEYS.TOKEN);
    storage.removeItem(STORAGE_KEYS.USER);
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  },

  getCurrentUser(): User | null {
    return storage.getItem<User>(STORAGE_KEYS.USER);
  },

  getToken(): string | null {
    return storage.getItem<string>(STORAGE_KEYS.TOKEN);
  },

  isAuthenticated(): boolean {
    const token = this.getToken();
    const user = this.getCurrentUser();
    return !!(token && user);
  },

  // Utility method to clear all auth data
  clearAuthData(): void {
    storage.removeMultiple([STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER]);
  },

  // Utility method to get auth headers
  getAuthHeaders(): Record<string, string> {
    const token = this.getToken();
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
    return {};
  },
};

export default auth;