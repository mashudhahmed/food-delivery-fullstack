import api from './api';
import { storage, STORAGE_KEYS } from './storage';

export interface AuthUser {
  id: string;
  name?: string;
  fullName?: string;
  email: string;
  role: 'customer' | 'owner' | 'agent' | 'admin';
  status?: string;
  phone?: string;
  avatar?: string;
}

export interface AuthResponse {
  accessToken?: string;
  refreshToken?: string;
  token?: string;
  expiresIn?: number;
  user: AuthUser;
}

export const auth = {
  /**
   * Supports both calling styles:
   *   auth.login(email, password)
   *   auth.login({ email, password })
   */
  async login(
    emailOrData: string | { email: string; password: string },
    password?: string,
  ): Promise<AuthResponse> {
    let email: string;
    let pass: string;

    if (typeof emailOrData === 'object' && emailOrData !== null) {
      email = emailOrData.email;
      pass = emailOrData.password;
    } else {
      email = emailOrData as string;
      pass = password as string;
    }

    const { data } = await api.post('/auth/login', { email, password: pass });
    const result = data.data || data;

    const accessToken = result.accessToken || result.token;
    const refreshToken = result.refreshToken;

    if (accessToken) {
      storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', accessToken);
      }
    }

    if (refreshToken) {
      storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }

    if (result.user) {
      storage.setItem(STORAGE_KEYS.USER, result.user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(result.user));
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'));
    }

    return {
      ...result,
      accessToken,
      token: accessToken,
      user: result.user,
    };
  },

  async register(payload: any): Promise<AuthResponse> {
    const body = {
      name: payload.name || payload.fullName,
      email: payload.email,
      password: payload.password,
      phone: payload.phone,
      role: payload.role || 'customer',
      businessName: payload.businessName,
      businessAddress: payload.businessAddress,
      taxId: payload.taxId,
      nidNumber: payload.nidNumber,
      vehicleType: payload.vehicleType,
      vehicleNumber: payload.vehicleNumber,
      drivingLicense: payload.drivingLicense,
      address: payload.address,
    };

    const { data } = await api.post('/auth/register', body);
    const result = data.data || data;

    const accessToken = result.accessToken || result.token;
    const refreshToken = result.refreshToken;

    if (accessToken) {
      storage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', accessToken);
      }
    }

    if (refreshToken) {
      storage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }

    if (result.user) {
      storage.setItem(STORAGE_KEYS.USER, result.user);
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(result.user));
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth-change'));
    }

    return {
      ...result,
      accessToken,
      token: accessToken,
      user: result.user,
    };
  },

  async logout(): Promise<void> {
    try {
      const refreshToken = storage.getItem<string>(STORAGE_KEYS.REFRESH_TOKEN);
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      console.warn('Logout API call failed, clearing local session anyway');
    } finally {
      // Clear new storage
      storage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      storage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      storage.removeItem(STORAGE_KEYS.USER);

      // Clear all possible old keys
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      }

      // Disconnect WebSocket
      try {
        const { disconnectSocket } = await import('./websocket');
        disconnectSocket();
      } catch {}

      // Notify whole app
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-change'));
      }
    }
  },

  getUser(): AuthUser | null {
    return storage.getItem<AuthUser>(STORAGE_KEYS.USER);
  },

  getCurrentUser(): AuthUser | null {
    return this.getUser();
  },

  getToken(): string | null {
    return (
      storage.getItem<string>(STORAGE_KEYS.ACCESS_TOKEN) ||
      (typeof window !== 'undefined' ? localStorage.getItem('token') : null)
    );
  },

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.getUser();
  },
};