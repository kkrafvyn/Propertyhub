/**
 * React Native Backend Configuration
 * 
 * Configuration settings for React Native mobile backend integration
 * Handles API endpoints, authentication, and mobile-specific settings
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

export interface ReactNativeConfig {
  apiUrl: string;
  wsUrl: string;
  authTimeout: number;
  cacheTimeout: number;
  offlineSync: boolean;
  pushNotifications: boolean;
  biometricAuth: boolean;
  deepLinking: boolean;
}

export interface ApiEndpoints {
  auth: {
    login: string;
    signup: string;
    refresh: string;
    logout: string;
    biometric: string;
  };
  properties: {
    list: string;
    search: string;
    details: string;
    favorites: string;
    booking: string;
  };
  chat: {
    rooms: string;
    messages: string;
    upload: string;
  };
  user: {
    profile: string;
    dashboard: string;
    settings: string;
  };
  notifications: {
    register: string;
    preferences: string;
    history: string;
  };
  analytics: {
    track: string;
    events: string;
  };
}

// Development Configuration
const DEV_CONFIG: ReactNativeConfig = {
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'ws://localhost:3000/ws',
  authTimeout: 300000, // 5 minutes
  cacheTimeout: 600000, // 10 minutes
  offlineSync: true,
  pushNotifications: true,
  biometricAuth: true,
  deepLinking: true,
};

// Production Configuration
const PROD_CONFIG: ReactNativeConfig = {
  apiUrl: 'https://api.propertyhub.com/api',
  wsUrl: 'wss://api.propertyhub.com/ws',
  authTimeout: 900000, // 15 minutes
  cacheTimeout: 1800000, // 30 minutes
  offlineSync: true,
  pushNotifications: true,
  biometricAuth: true,
  deepLinking: true,
};

// API Endpoints Configuration
export const API_ENDPOINTS: ApiEndpoints = {
  auth: {
    login: '/auth/login',
    signup: '/auth/signup',
    refresh: '/auth/refresh',
    logout: '/auth/logout',
    biometric: '/auth/biometric',
  },
  properties: {
    list: '/properties',
    search: '/properties/search',
    details: '/properties/:id',
    favorites: '/properties/favorites',
    booking: '/properties/:id/book',
  },
  chat: {
    rooms: '/chat/rooms',
    messages: '/chat/rooms/:roomId/messages',
    upload: '/chat/upload',
  },
  user: {
    profile: '/user/profile',
    dashboard: '/user/dashboard',
    settings: '/user/settings',
  },
  notifications: {
    register: '/notifications/register',
    preferences: '/notifications/preferences',
    history: '/notifications/history',
  },
  analytics: {
    track: '/analytics/track',
    events: '/analytics/events',
  },
};

// Get configuration based on environment
export const getConfig = (): ReactNativeConfig => {
  const isDev = process.env.NODE_ENV === 'development';
  return isDev ? DEV_CONFIG : PROD_CONFIG;
};

// Platform Detection
export const isIOS = (): boolean => {
  return typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isAndroid = (): boolean => {
  return typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);
};

// Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: '@PropertyHub:authToken',
  REFRESH_TOKEN: '@PropertyHub:refreshToken',
  USER_DATA: '@PropertyHub:userData',
  CACHED_PROPERTIES: '@PropertyHub:cachedProperties',
  OFFLINE_QUEUE: '@PropertyHub:offlineQueue',
  PUSH_TOKEN: '@PropertyHub:pushToken',
  BIOMETRIC_ENABLED: '@PropertyHub:biometricEnabled',
  THEME_PREFERENCE: '@PropertyHub:themePreference',
  LANGUAGE_PREFERENCE: '@PropertyHub:languagePreference',
} as const;

// Error Codes
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  OFFLINE_MODE: 'OFFLINE_MODE',
  BIOMETRIC_FAILED: 'BIOMETRIC_FAILED',
} as const;

// Push Notification Types
export const NOTIFICATION_TYPES = {
  CHAT_MESSAGE: 'chat_message',
  BOOKING_UPDATE: 'booking_update',
  PROPERTY_ALERT: 'property_alert',
  PAYMENT_STATUS: 'payment_status',
  SYSTEM_UPDATE: 'system_update',
} as const;

export default getConfig();