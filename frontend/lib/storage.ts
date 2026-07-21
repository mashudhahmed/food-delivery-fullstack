/**
 * Safe localStorage utilities with error handling and type safety
 * Prevents "undefined" is not valid JSON errors
 */

export const storage = {
  /**
   * Safely get an item from localStorage with type safety
   * @param key - The storage key
   * @param defaultValue - Default value if item doesn't exist or is invalid
   * @returns The parsed value or defaultValue
   */
  getItem<T>(key: string, defaultValue: T | null = null): T | null {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return defaultValue;
    }

    try {
      const value = localStorage.getItem(key);
      
      // Handle null, undefined, and invalid string values
      if (!value || value === 'undefined' || value === 'null' || value === '') {
        return defaultValue;
      }
      
      // Try to parse JSON
      try {
        return JSON.parse(value) as T;
      } catch {
        // If JSON parsing fails, the value might be a plain string
        // For strings, we return as is (but wrapped in the type)
        return value as T;
      }
    } catch (error) {
      console.error(`Failed to get item "${key}":`, error);
      return defaultValue;
    }
  },

  /**
   * Safely set an item in localStorage
   * @param key - The storage key
   * @param value - The value to store (will be JSON.stringify'd)
   */
  setItem<T>(key: string, value: T): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // If value is undefined or null, remove the item instead
      if (value === undefined || value === null) {
        localStorage.removeItem(key);
        return;
      }
      
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Failed to set item "${key}":`, error);
    }
  },

  /**
   * Safely remove an item from localStorage
   * @param key - The storage key to remove
   */
  removeItem(key: string): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove item "${key}":`, error);
    }
  },

  /**
   * Safely clear all localStorage items
   */
  clear(): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  },

  /**
   * Check if a key exists in localStorage
   * @param key - The storage key to check
   * @returns true if the key exists and has a valid value
   */
  hasKey(key: string): boolean {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return false;
    }

    try {
      const value = localStorage.getItem(key);
      return !!(value && value !== 'undefined' && value !== 'null' && value !== '');
    } catch {
      return false;
    }
  },

  /**
   * Get all keys from localStorage
   * @returns Array of all keys
   */
  getKeys(): string[] {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      return Object.keys(localStorage);
    } catch (error) {
      console.error('Failed to get storage keys:', error);
      return [];
    }
  },

  /**
   * Get all items from localStorage as an object
   * @returns Object containing all key-value pairs
   */
  getAll(): Record<string, unknown> {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return {};
    }

    try {
      const result: Record<string, unknown> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          result[key] = this.getItem(key);
        }
      }
      return result;
    } catch (error) {
      console.error('Failed to get all storage items:', error);
      return {};
    }
  },

  /**
   * Set multiple items at once
   * @param items - Object containing key-value pairs to set
   */
  setMultiple(items: Record<string, unknown>): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      Object.entries(items).forEach(([key, value]) => {
        this.setItem(key, value);
      });
    } catch (error) {
      console.error('Failed to set multiple items:', error);
    }
  },

  /**
   * Remove multiple items at once
   * @param keys - Array of keys to remove
   */
  removeMultiple(keys: string[]): void {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      keys.forEach(key => this.removeItem(key));
    } catch (error) {
      console.error('Failed to remove multiple items:', error);
    }
  },
};

// Export default for convenience
export default storage;