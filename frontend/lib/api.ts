import axios from 'axios';
import { storage } from './storage';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - safe token handling using storage utility
api.interceptors.request.use(
  (config) => {
    try {
      const token = storage.getItem<string>('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to get token for request:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      // Token expired or invalid - clear storage
      storage.removeItem('token');
      storage.removeItem('user');
      
      // Dispatch event for components to react
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-change'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;