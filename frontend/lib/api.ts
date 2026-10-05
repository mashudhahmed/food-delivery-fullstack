// lib/api.ts
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage, STORAGE_KEYS } from './storage';
import { getUserFriendlyError, logError } from './error-handler';
import toast from 'react-hot-toast';

// ✅ FIXED: Use the correct API URL with /api/v1 prefix
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ==================== TYPES ====================
interface FailedRequest {
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}

// ==================== REQUEST INTERCEPTOR ====================
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = storage.getItem<string>(STORAGE_KEYS.ACCESS_TOKEN);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

// ==================== RESPONSE INTERCEPTOR WITH RETRY ====================
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

const getRetryDelay = (attempt: number): number => {
  return Math.min(RETRY_DELAY * Math.pow(2, attempt), 10000);
};

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: unknown | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
      _retryCount?: number;
      url?: string;
    };

    // ======== RETRY LOGIC (Network errors only) ========
    if (!error.response) {
      originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

      if (originalRequest._retryCount <= MAX_RETRIES) {
        const delay = getRetryDelay(originalRequest._retryCount - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return api(originalRequest);
      }
    }

    // ======== RATE LIMIT (429) ========
    if (error.response?.status === 429) {
      toast.error('Too many requests. Please wait a moment and try again.');
      return Promise.reject(error);
    }

    // ======== TOKEN REFRESH (401) ========
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = storage.getItem<string>(STORAGE_KEYS.REFRESH_TOKEN);

      if (!refreshToken) {
        storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        storage.removeItem(STORAGE_KEYS.USER);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth-change'));
        }
        toast.error('Session expired. Please login again.');
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_URL}/auth/refresh`, {
          refreshToken,
        });

        const wrappedData = data.success ? data.data : data;
        const newAccessToken = wrappedData.accessToken || wrappedData.token;
        const newRefreshToken = wrappedData.refreshToken;

        storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, newAccessToken);
        if (newRefreshToken) {
          storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, newRefreshToken);
        }

        processQueue(null, newAccessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        storage.removeItem(STORAGE_KEYS.USER);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('auth-change'));
        }
        toast.error('Session expired. Please login again.');
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // ======== NON-AUTH ERRORS ========
    const isAuthEndpoint = originalRequest.url?.includes('/auth/') ?? false;
    const skipGlobalToast = (originalRequest as any)?.skipGlobalToast ?? false;

    if (!error.response && (originalRequest._retryCount || 0) >= MAX_RETRIES) {
      toast.error('Unable to connect to server. Please check your connection.', {
        id: 'network-offline',
      });
    } else if (!isAuthEndpoint && !skipGlobalToast && error.response) {
      const message = getUserFriendlyError(error);
      const status = error.response.status;
      if (status === 403) {
        toast.error('You do not have permission to perform this action.', { id: 'forbidden-action' });
      } else if (status >= 500) {
        toast.error('Server error. Please try again later.', { id: 'server-error' });
      } else if (status !== 404) {
        // Deduplicate using message as ID so callers calling showErrorToast never double-toast
        toast.error(message, { id: message });
      }
    }

    logError(error, 'API.interceptor');

    return Promise.reject(error);
  }
);

export { api };
export default api;