// lib/api.ts
import axios from 'axios';
import { storage } from './storage';

// ✅ Use environment variable with proper API path
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

console.log('🔵 API Base URL:', API_BASE_URL);

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
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
        console.log('🔵 API Request with token:', config.url);
      } else {
        console.log('🔵 API Request without token:', config.url);
      }
    } catch (error) {
      console.error('Failed to get token for request:', error);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle auth errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ API Response success:', response.config.url, response.status);
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.log('🔴 401 Unauthorized - Clearing auth data');
      // Token expired or invalid - clear storage
      storage.removeItem('token');
      storage.removeItem('user');
      
      // Dispatch event for components to react
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-change'));
        // Redirect to login if not already on login page
        if (!window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/auth')) {
          window.location.href = '/login';
        }
      }
    }
    console.error('❌ API Response error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

export default api;

// ✅ Export auth from the correct location
export { auth } from './auth';