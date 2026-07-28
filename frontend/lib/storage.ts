const isBrowser = typeof window !== 'undefined';

export const storage = {
  getItem<T = any>(key: string): T | null {
    if (!isBrowser) return null;
    try {
      const value = localStorage.getItem(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch {
      // fallback for non-JSON values (old tokens)
      return localStorage.getItem(key) as any;
    }
  },

  setItem(key: string, value: any): void {
    if (!isBrowser) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('storage.setItem error', err);
    }
  },

  removeItem(key: string): void {
    if (!isBrowser) return;
    localStorage.removeItem(key);
  },

  clear(): void {
    if (!isBrowser) return;
    localStorage.clear();
  },
};

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user',
  CART: 'cart',
  FAVORITES: 'favorites',
  ADDRESSES: 'addresses',
} as const;