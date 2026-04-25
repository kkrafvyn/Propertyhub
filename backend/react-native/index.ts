/**
 * React Native Backend Integration - Main Export
 * 
 * Central export point for all React Native backend services and utilities
 * Provides a unified API for mobile app integration
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

// Core Configuration
export { 
  getConfig, 
  isIOS, 
  isAndroid, 
  API_ENDPOINTS, 
  STORAGE_KEYS, 
  ERROR_CODES, 
  NOTIFICATION_TYPES 
} from './config';

// API Service
export { 
  apiService as default, 
  apiService 
} from './apiService';
export type { 
  ApiResponse, 
  RequestOptions, 
  AuthCredentials, 
  BiometricCredentials, 
  PushNotificationData 
} from './apiService';

// Mobile Utilities
export {
  BiometricAuth,
  PushNotificationManager,
  MobileStorage,
  LocationManager,
  DeviceInfoManager,
  OfflineSyncManager,
  MobileAnalytics,
} from './mobileBackendUtils';
export type {
  BiometricOptions,
  PushNotificationPayload,
  LocationData,
  DeviceInfo,
  SyncStatus,
} from './mobileBackendUtils';

// WebSocket Manager
export { 
  webSocketManager, 
  ReactNativeWebSocketManager 
} from './webSocketManager';
export type {
  WebSocketMessage,
  WebSocketOptions,
  ConnectionStatus,
  WebSocketEventType,
  WebSocketEventHandler,
} from './webSocketManager';

// Data Sync Service
export { 
  mobileDataSyncService, 
  MobileDataSyncService 
} from './mobileDataSyncService';
export type {
  SyncItem,
  SyncConflict,
  SyncProgress,
  SyncOptions,
} from './mobileDataSyncService';

/**
 * React Native Backend Manager
 * 
 * High-level manager that coordinates all React Native backend services
 * Provides a simplified API for common mobile operations
 */
export class ReactNativeBackendManager {
  private initialized = false;
  private services = {
    api: null as any,
    webSocket: null as any,
    sync: null as any,
    pushNotifications: null as any,
    biometric: null as any,
    location: null as any,
    analytics: null as any,
  };

  /**
   * Initialize all React Native backend services
   */
  async initialize(options: {
    authToken?: string;
    enablePushNotifications?: boolean;
    enableBiometric?: boolean;
    enableLocation?: boolean;
    enableAnalytics?: boolean;
    autoSync?: boolean;
  } = {}): Promise<void> {
    if (this.initialized) {
      console.log('⚠️ React Native backend already initialized');
      return;
    }

    console.log('🚀 Initializing React Native backend services...');

    try {
      // Initialize API service
      const { apiService } = await import('./apiService');
      this.services.api = apiService;

      // Initialize WebSocket if auth token is provided
      if (options.authToken) {
        const { webSocketManager } = await import('./webSocketManager');
        await webSocketManager.connect(options.authToken);
        this.services.webSocket = webSocketManager;
      }

      // Initialize data sync service
      const { mobileDataSyncService } = await import('./mobileDataSyncService');
      this.services.sync = mobileDataSyncService;

      // Initialize push notifications
      if (options.enablePushNotifications !== false) {
        const { PushNotificationManager } = await import('./mobileBackendUtils');
        const result = await PushNotificationManager.initialize();
        if (result.success) {
          this.services.pushNotifications = PushNotificationManager;
          console.log('🔔 Push notifications initialized');
        }
      }

      // Initialize biometric authentication
      if (options.enableBiometric !== false) {
        const { BiometricAuth } = await import('./mobileBackendUtils');
        const available = await BiometricAuth.isAvailable();
        if (available) {
          this.services.biometric = BiometricAuth;
          console.log('🔐 Biometric authentication available');
        }
      }

      // Initialize location services
      if (options.enableLocation !== false) {
        const { LocationManager } = await import('./mobileBackendUtils');
        this.services.location = LocationManager;
        console.log('📍 Location services initialized');
      }

      // Initialize analytics
      if (options.enableAnalytics !== false) {
        const { MobileAnalytics } = await import('./mobileBackendUtils');
        this.services.analytics = MobileAnalytics;
        console.log('📊 Analytics initialized');
      }

      // Start auto-sync if enabled
      if (options.autoSync !== false) {
        this.services.sync.startSync({ forceFullSync: false });
      }

      this.initialized = true;
      console.log('✅ React Native backend services initialized successfully');

      // Track initialization
      if (this.services.analytics) {
        this.services.analytics.trackEvent('backend_initialized', {
          services: Object.keys(this.services).filter(key => this.services[key] !== null),
        });
      }

    } catch (error) {
      console.error('❌ Failed to initialize React Native backend:', error);
      throw error;
    }
  }

  /**
   * Check if backend is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get API service
   */
  getApiService() {
    if (!this.services.api) {
      throw new Error('API service not initialized');
    }
    return this.services.api;
  }

  /**
   * Get WebSocket manager
   */
  getWebSocketManager() {
    if (!this.services.webSocket) {
      throw new Error('WebSocket manager not initialized');
    }
    return this.services.webSocket;
  }

  /**
   * Get data sync service
   */
  getSyncService() {
    if (!this.services.sync) {
      throw new Error('Sync service not initialized');
    }
    return this.services.sync;
  }

  /**
   * Get push notification manager
   */
  getPushNotificationManager() {
    if (!this.services.pushNotifications) {
      throw new Error('Push notification manager not initialized');
    }
    return this.services.pushNotifications;
  }

  /**
   * Get biometric auth service
   */
  getBiometricAuth() {
    if (!this.services.biometric) {
      throw new Error('Biometric auth not available');
    }
    return this.services.biometric;
  }

  /**
   * Get location manager
   */
  getLocationManager() {
    if (!this.services.location) {
      throw new Error('Location manager not initialized');
    }
    return this.services.location;
  }

  /**
   * Get analytics service
   */
  getAnalytics() {
    if (!this.services.analytics) {
      throw new Error('Analytics not initialized');
    }
    return this.services.analytics;
  }

  /**
   * Authenticate user with credentials
   */
  async login(email: string, password: string, rememberMe = false): Promise<any> {
    const api = this.getApiService();
    const result = await api.login({ email, password, rememberMe });

    if (result.success && result.data) {
      // Connect WebSocket with new token
      if (this.services.webSocket) {
        this.services.webSocket.updateAuthToken(result.data.token);
      }

      // Register push notification token
      if (this.services.pushNotifications) {
        const pushToken = this.services.pushNotifications.getToken();
        if (pushToken) {
          await api.registerPushToken({
            token: pushToken,
            platform: isIOS() ? 'ios' : 'android',
            userId: result.data.user.id,
          });
        }
      }

      // Start sync after login
      if (this.services.sync) {
        this.services.sync.startSync({ forceFullSync: true });
      }

      // Track login
      if (this.services.analytics) {
        this.services.analytics.trackEvent('user_logged_in', {
          user_id: result.data.user.id,
          method: 'credentials',
        });
      }
    }

    return result;
  }

  /**
   * Authenticate user with biometrics
   */
  async biometricLogin(userId: string): Promise<any> {
    const biometric = this.getBiometricAuth();
    const api = this.getApiService();

    const authResult = await biometric.authenticate({
      promptMessage: 'Authenticate to access PropertyHub',
      fallbackLabel: 'Use password',
      cancelLabel: 'Cancel',
    });

    if (!authResult.success) {
      return { success: false, error: authResult.error };
    }

    // Get biometric token
    const { MobileStorage } = await import('./mobileBackendUtils');
    const biometricToken = await MobileStorage.getSecureItem(`@PropertyHub:biometricEnabled_token`);

    if (!biometricToken) {
      return { success: false, error: 'Biometric authentication not setup' };
    }

    const result = await api.biometricLogin({ userId, biometricToken });

    if (result.success && result.data) {
      // Connect WebSocket with new token
      if (this.services.webSocket) {
        this.services.webSocket.updateAuthToken(result.data.token);
      }

      // Start sync after login
      if (this.services.sync) {
        this.services.sync.startSync({ forceFullSync: true });
      }

      // Track biometric login
      if (this.services.analytics) {
        this.services.analytics.trackEvent('user_logged_in', {
          user_id: result.data.user.id,
          method: 'biometric',
        });
      }
    }

    return result;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    const api = this.getApiService();
    
    // Logout from API
    await api.logout();

    // Disconnect WebSocket
    if (this.services.webSocket) {
      this.services.webSocket.disconnect();
    }

    // Clear sync queue
    if (this.services.sync) {
      await this.services.sync.clearSyncQueue();
    }

    // Track logout
    if (this.services.analytics) {
      this.services.analytics.trackEvent('user_logged_out');
    }

    console.log('👋 User logged out successfully');
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<any> {
    const location = this.getLocationManager();
    return await location.getCurrentLocation();
  }

  /**
   * Send push notification
   */
  async sendNotification(title: string, body: string, data?: any): Promise<void> {
    const pushManager = this.getPushNotificationManager();
    await pushManager.sendLocalNotification({
      title,
      body,
      data,
    });
  }

  /**
   * Track analytics event
   */
  async trackEvent(event: string, properties?: any): Promise<void> {
    const analytics = this.getAnalytics();
    await analytics.trackEvent(event, properties);
  }

  /**
   * Force data synchronization
   */
  async forceSync(): Promise<void> {
    const sync = this.getSyncService();
    await sync.startSync({ forceFullSync: true });
  }

  /**
   * Get sync status
   */
  getSyncStatus(): any {
    const sync = this.getSyncService();
    return sync.getSyncProgress();
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): any {
    if (!this.services.webSocket) {
      return { connected: false, connecting: false };
    }
    return this.services.webSocket.getStatus();
  }

  /**
   * Cleanup all services
   */
  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up React Native backend services...');

    // Disconnect WebSocket
    if (this.services.webSocket) {
      this.services.webSocket.disconnect();
    }

    // Clear API cache
    if (this.services.api) {
      this.services.api.clearCache();
    }

    // Clear sync queue
    if (this.services.sync) {
      await this.services.sync.clearSyncQueue();
    }

    this.initialized = false;
    console.log('✅ React Native backend services cleaned up');
  }
}

// Export singleton instance
export const reactNativeBackend = new ReactNativeBackendManager();

/**
 * Convenience functions for React Native integration
 */

/**
 * Quick initialization for React Native apps
 */
export async function initializeReactNativeBackend(options?: {
  authToken?: string;
  enablePushNotifications?: boolean;
  enableBiometric?: boolean;
  enableLocation?: boolean;
  enableAnalytics?: boolean;
  autoSync?: boolean;
}): Promise<ReactNativeBackendManager> {
  await reactNativeBackend.initialize(options);
  return reactNativeBackend;
}

/**
 * Quick login for React Native apps
 */
export async function loginToPropertyHub(
  email: string, 
  password: string, 
  rememberMe = false
): Promise<any> {
  if (!reactNativeBackend.isInitialized()) {
    await reactNativeBackend.initialize();
  }
  return await reactNativeBackend.login(email, password, rememberMe);
}

/**
 * Quick biometric login for React Native apps
 */
export async function biometricLoginToPropertyHub(userId: string): Promise<any> {
  if (!reactNativeBackend.isInitialized()) {
    await reactNativeBackend.initialize({ enableBiometric: true });
  }
  return await reactNativeBackend.biometricLogin(userId);
}

/**
 * Quick logout for React Native apps
 */
export async function logoutFromPropertyHub(): Promise<void> {
  if (reactNativeBackend.isInitialized()) {
    await reactNativeBackend.logout();
  }
}

/**
 * Development and debugging utilities
 */
export const ReactNativeBackendDebug = {
  /**
   * Get debug information about all services
   */
  getDebugInfo(): any {
    return {
      initialized: reactNativeBackend.isInitialized(),
      connectionStatus: reactNativeBackend.isInitialized() 
        ? reactNativeBackend.getConnectionStatus() 
        : null,
      syncStatus: reactNativeBackend.isInitialized() 
        ? reactNativeBackend.getSyncStatus() 
        : null,
      services: {
        api: !!reactNativeBackend['services']?.api,
        webSocket: !!reactNativeBackend['services']?.webSocket,
        sync: !!reactNativeBackend['services']?.sync,
        pushNotifications: !!reactNativeBackend['services']?.pushNotifications,
        biometric: !!reactNativeBackend['services']?.biometric,
        location: !!reactNativeBackend['services']?.location,
        analytics: !!reactNativeBackend['services']?.analytics,
      },
    };
  },

  /**
   * Log debug information to console
   */
  logDebugInfo(): void {
    console.log('🔍 React Native Backend Debug Info:', this.getDebugInfo());
  },

  /**
   * Test all services
   */
  async testServices(): Promise<any> {
    const results: any = {};
    
    if (reactNativeBackend.isInitialized()) {
      try {
        // Test API
        results.api = reactNativeBackend['services'].api ? 'available' : 'not available';
        
        // Test WebSocket
        results.webSocket = reactNativeBackend['services'].webSocket 
          ? (reactNativeBackend['services'].webSocket.isConnected() ? 'connected' : 'disconnected')
          : 'not available';
        
        // Test biometric
        if (reactNativeBackend['services'].biometric) {
          const available = await reactNativeBackend['services'].biometric.isAvailable();
          results.biometric = available ? 'available' : 'not available';
        } else {
          results.biometric = 'not initialized';
        }
        
        // Test location
        if (reactNativeBackend['services'].location) {
          const location = await reactNativeBackend['services'].location.getCurrentLocation();
          results.location = location.success ? 'working' : 'failed';
        } else {
          results.location = 'not initialized';
        }
        
      } catch (error) {
        results.error = error.message;
      }
    } else {
      results.error = 'Backend not initialized';
    }
    
    console.log('🧪 Service Test Results:', results);
    return results;
  },
};

// Export debug utilities for development
export { ReactNativeBackendDebug as Debug };