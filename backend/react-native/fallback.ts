/**
 * React Native Backend Fallback
 * 
 * Fallback implementation for when React Native modules are not available
 * Provides mock implementations to prevent errors in web environments
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

// Mock implementations for React Native backend when not available
export const mockReactNativeBackend = {
  isInitialized: () => false,
  initialize: async () => ({ success: false, error: 'React Native backend not available' }),
  login: async () => ({ success: false, error: 'Backend not available' }),
  biometricLogin: async () => ({ success: false, error: 'Backend not available' }),
  logout: async () => {},
  getCurrentLocation: async () => ({ success: false, error: 'Backend not available' }),
  sendNotification: async () => {},
  trackEvent: async () => {},
  forceSync: async () => {},
  getConnectionStatus: () => ({ connected: false, connecting: false, reconnectAttempts: 0 }),
  getSyncStatus: () => ({ total: 0, completed: 0, failed: 0, conflicts: 0, phase: 'complete' as const }),
  getWebSocketManager: () => ({
    getStatus: () => ({ connected: false, connecting: false, reconnectAttempts: 0 }),
    on: () => {},
    off: () => {},
  }),
  getSyncService: () => ({
    getSyncProgress: () => ({ total: 0, completed: 0, failed: 0, conflicts: 0, phase: 'complete' as const }),
    getConflicts: () => [],
    on: () => {},
    off: () => {},
  }),
  getAnalytics: () => ({
    trackScreen: async () => {},
    trackEvent: async () => {},
  }),
  cleanup: async () => {},
};

export const mockBiometricAuth = {
  isAvailable: async () => false,
  authenticate: async () => ({ success: false, error: 'Not available' }),
  setup: async () => ({ success: false, error: 'Not available' }),
};

export const mockPushNotificationManager = {
  initialize: async () => ({ success: false, error: 'Not available' }),
  sendLocalNotification: async () => {},
  subscribe: () => () => {},
  getToken: () => null,
};

export const mockMobileStorage = {
  setSecureItem: async () => {},
  getSecureItem: async () => null,
  setItem: async () => {},
  getItem: async () => null,
  removeItem: async () => {},
  clear: async () => {},
};

export const mockLocationManager = {
  getCurrentLocation: async () => ({ success: false, error: 'Not available' }),
  watchLocation: () => () => {},
};

export const mockDeviceInfoManager = {
  getDeviceInfo: async () => ({
    platform: 'ios' as const,
    version: '1.0.0',
    model: 'Mock Device',
    uniqueId: 'mock-device-id',
    systemVersion: 'Mock OS',
    buildNumber: '1',
    bundleId: 'com.propertyhub.mock',
  }),
};

export const mockMobileAnalytics = {
  trackEvent: async () => {},
  trackScreen: async () => {},
  trackUserAction: async () => {},
};

export const mockWebSocketManager = {
  connect: async () => {},
  disconnect: () => {},
  send: () => false,
  on: () => {},
  once: () => {},
  off: () => {},
  getStatus: () => ({ connected: false, connecting: false, reconnectAttempts: 0 }),
  getQueuedMessageCount: () => 0,
  clearMessageQueue: () => {},
  updateAuthToken: () => {},
  isConnected: () => false,
};

export const mockMobileDataSyncService = {
  startSync: async () => {},
  queueForSync: async () => {},
  getSyncProgress: () => ({ total: 0, completed: 0, failed: 0, conflicts: 0, phase: 'complete' as const }),
  getConflicts: () => [],
  resolveConflictManually: async () => {},
  on: () => {},
  off: () => {},
  isSyncInProgress: () => false,
  getLastSyncTime: () => new Date(0),
  clearSyncQueue: async () => {},
};

// Mock configuration
export const mockConfig = {
  apiUrl: 'http://localhost:3000/api',
  wsUrl: 'ws://localhost:3000/ws',
  authTimeout: 300000,
  cacheTimeout: 600000,
  offlineSync: false,
  pushNotifications: false,
  biometricAuth: false,
  deepLinking: false,
};

export const mockApiEndpoints = {
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

export const mockStorageKeys = {
  AUTH_TOKEN: '@PropertyHub:authToken',
  REFRESH_TOKEN: '@PropertyHub:refreshToken',
  USER_DATA: '@PropertyHub:userData',
  CACHED_PROPERTIES: '@PropertyHub:cachedProperties',
  OFFLINE_QUEUE: '@PropertyHub:offlineQueue',
  PUSH_TOKEN: '@PropertyHub:pushToken',
  BIOMETRIC_ENABLED: '@PropertyHub:biometricEnabled',
  THEME_PREFERENCE: '@PropertyHub:themePreference',
  LANGUAGE_PREFERENCE: '@PropertyHub:languagePreference',
};

export const mockErrorCodes = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  OFFLINE_MODE: 'OFFLINE_MODE',
  BIOMETRIC_FAILED: 'BIOMETRIC_FAILED',
};

export const mockNotificationTypes = {
  CHAT_MESSAGE: 'chat_message',
  BOOKING_UPDATE: 'booking_update',
  PROPERTY_ALERT: 'property_alert',
  PAYMENT_STATUS: 'payment_status',
  SYSTEM_UPDATE: 'system_update',
};

// Debug utilities for mock backend
export const mockDebugUtils = {
  getDebugInfo: () => ({
    initialized: false,
    services: {
      api: 'mock',
      webSocket: 'mock',
      sync: 'mock',
      pushNotifications: 'mock',
      biometric: 'mock',
      location: 'mock',
      analytics: 'mock',
    },
    backendType: 'mock',
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  }),
  
  testServices: async () => ({
    backend: 'mock',
    api: 'mock',
    websocket: 'mock',
    location: 'mock',
    notifications: 'mock',
    biometric: 'mock',
    analytics: 'mock',
  }),
  
  logDebugInfo: () => {
    console.log('🔍 Mock React Native Backend Debug Info:', mockDebugUtils.getDebugInfo());
  },
};

export default {
  reactNativeBackend: mockReactNativeBackend,
  BiometricAuth: mockBiometricAuth,
  PushNotificationManager: mockPushNotificationManager,
  MobileStorage: mockMobileStorage,
  LocationManager: mockLocationManager,
  DeviceInfoManager: mockDeviceInfoManager,
  MobileAnalytics: mockMobileAnalytics,
  webSocketManager: mockWebSocketManager,
  mobileDataSyncService: mockMobileDataSyncService,
  getConfig: () => mockConfig,
  isIOS: () => false,
  isAndroid: () => false,
  API_ENDPOINTS: mockApiEndpoints,
  STORAGE_KEYS: mockStorageKeys,
  ERROR_CODES: mockErrorCodes,
  NOTIFICATION_TYPES: mockNotificationTypes,
  Debug: mockDebugUtils,
};