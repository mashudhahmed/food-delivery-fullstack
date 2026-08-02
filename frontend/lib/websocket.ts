import { io, Socket } from 'socket.io-client';
import { storage, STORAGE_KEYS } from './storage';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

let socket: Socket | null = null;

export const connectSocket = (): Socket | null => {
  if (typeof window === 'undefined') return null;

  const token = storage.getItem<string>(STORAGE_KEYS.ACCESS_TOKEN);
  if (!token) return null;

  if (socket?.connected) return socket;

  socket = io(`${WS_URL}/notifications`, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect', () => {
    console.log('[WS] Connected');
  });

  socket.on('disconnect', (reason) => {
    console.log('[WS] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[WS] Connection error:', err.message);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

// Compatibility object used by NotificationInitializer
export const wsService = {
  connect: connectSocket,
  disconnect: disconnectSocket,
  getSocket: getSocket,

  on(event: string, callback: (...args: any[]) => void) {
    const s = connectSocket();
    s?.on(event, callback);
  },

  off(event: string, callback?: (...args: any[]) => void) {
    socket?.off(event, callback);
  },

  emit(event: string, data?: any) {
    socket?.emit(event, data);
  },
};