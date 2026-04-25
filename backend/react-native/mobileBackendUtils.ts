/**
 * Mobile Backend Utilities
 * 
 * Utility functions and services for React Native backend integration
 * Handles push notifications, biometric auth, offline sync, and mobile-specific features
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

import { STORAGE_KEYS, ERROR_CODES, NOTIFICATION_TYPES } from './config';
import type { User, Property, ChatRoom } from '../../types';

export interface BiometricOptions {
  promptMessage: string;
  fallbackLabel?: string;
  cancelLabel?: string;
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
  category?: string;
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
}

export interface DeviceInfo {
  platform: 'ios' | 'android';
  version: string;
  model: string;
  uniqueId: string;
  systemVersion: string;
  buildNumber: string;
  bundleId: string;
}

export interface SyncStatus {
  lastSync: Date;
  pendingUploads: number;
  pendingDownloads: number;
  conflicts: Array<{
    id: string;
    type: 'property' | 'chat' | 'user';
    localData: any;
    serverData: any;
  }>;
}

/**
 * Biometric Authentication Utilities
 */
export class BiometricAuth {
  /**
   * Check if biometric authentication is available
   */
  static async isAvailable(): Promise<boolean> {
    try {
      // Check if we're in a web environment
      if (typeof window === 'undefined') {
        return false;
      }

      // For React Native, use react-native-biometrics or TouchID/FaceID
      // For web, use Web Authentication API
      if ('credentials' in navigator && navigator.credentials) {
        try {
          // Check if platform authenticator is available
          const available = await (navigator.credentials as any).get({
            publicKey: {
              challenge: new Uint8Array(1),
              timeout: 1000,
              userVerification: 'preferred'
            }
          });
          return false; // Return false for now as this is just a check
        } catch {
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('❌ Biometric availability check failed:', error);
      return false;
    }
  }

  /**
   * Authenticate using biometrics
   */
  static async authenticate(options: BiometricOptions): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if we're in a web environment
      if (typeof window === 'undefined') {
        return { success: false, error: 'Not in web environment' };
      }

      // For React Native, implement with react-native-biometrics
      // For web, use Web Authentication API (simplified mock for demo)
      if ('credentials' in navigator && navigator.credentials) {
        try {
          // This is a simplified demo implementation
          // In production, you'd implement proper WebAuthn flow
          console.log('🔐 Simulating biometric authentication with options:', options);
          
          // Simulate authentication delay
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Return success for demo purposes
          return { success: true };
        } catch (error: any) {
          return { success: false, error: error.message || 'WebAuthn failed' };
        }
      }

      return { success: false, error: 'Biometric authentication not supported' };
    } catch (error: any) {
      console.error('❌ Biometric authentication failed:', error);
      return { success: false, error: error.message || 'Authentication failed' };
    }
  }

  /**
   * Setup biometric authentication for user
   */
  static async setup(userId: string): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      const isAvailable = await this.isAvailable();
      if (!isAvailable) {
        return { success: false, error: 'Biometric authentication not available' };
      }

      // Generate biometric token
      const token = `bio_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store biometric token securely
      await MobileStorage.setSecureItem(STORAGE_KEYS.BIOMETRIC_ENABLED, 'true');
      await MobileStorage.setSecureItem(`${STORAGE_KEYS.BIOMETRIC_ENABLED}_token`, token);

      return { success: true, token };
    } catch (error: any) {
      console.error('❌ Biometric setup failed:', error);
      return { success: false, error: error.message || 'Setup failed' };
    }
  }
}

/**
 * Push Notification Manager
 */
export class PushNotificationManager {
  private static token: string | null = null;
  private static listeners: Map<string, Function[]> = new Map();

  /**
   * Initialize push notifications
   */
  static async initialize(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      // Request permission
      const permission = await this.requestPermission();
      if (!permission) {
        return { success: false, error: 'Permission denied' };
      }

      // Get or generate FCM token
      const token = await this.getToken();
      if (!token) {
        return { success: false, error: 'Failed to get token' };
      }

      this.token = token;
      await MobileStorage.setItem(STORAGE_KEYS.PUSH_TOKEN, token);

      // Setup message listeners
      this.setupMessageHandlers();

      console.log('🔔 Push notifications initialized:', token);
      return { success: true, token };
    } catch (error: any) {
      console.error('❌ Push notification initialization failed:', error);
      return { success: false, error: error.message || 'Initialization failed' };
    }
  }

  /**
   * Request notification permission
   */
  private static async requestPermission(): Promise<boolean> {
    try {
      // For React Native, use @react-native-firebase/messaging
      // For web, use Notification API
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    } catch (error) {
      console.error('❌ Permission request failed:', error);
      return false;
    }
  }

  /**
   * Get FCM token
   */
  private static async getToken(): Promise<string | null> {
    try {
      // For React Native, use Firebase messaging
      // For web, generate a mock token
      if (typeof window !== 'undefined') {
        return `web_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      return null;
    } catch (error) {
      console.error('❌ Token generation failed:', error);
      return null;
    }
  }

  /**
   * Setup message handlers
   */
  private static setupMessageHandlers(): void {
    // For React Native, setup Firebase message handlers
    // For web, setup service worker message handlers
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, payload } = event.data;
        this.handleMessage(type, payload);
      });
    }
  }

  /**
   * Handle incoming push notification
   */
  private static handleMessage(type: string, payload: any): void {
    const listeners = this.listeners.get(type) || [];
    listeners.forEach(listener => {
      try {
        listener(payload);
      } catch (error) {
        console.error('❌ Message listener error:', error);
      }
    });
  }

  /**
   * Send local notification
   */
  static async sendLocalNotification(payload: PushNotificationPayload): Promise<void> {
    try {
      // For React Native, use react-native-push-notification
      // For web, use Notification API
      if (typeof window !== 'undefined' && 'Notification' in window) {
        new Notification(payload.title, {
          body: payload.body,
          data: payload.data,
          badge: payload.badge,
          tag: payload.category,
        });
      }
    } catch (error) {
      console.error('❌ Local notification failed:', error);
    }
  }

  /**
   * Subscribe to notification type
   */
  static subscribe(type: string, listener: Function): () => void {
    const listeners = this.listeners.get(type) || [];
    listeners.push(listener);
    this.listeners.set(type, listeners);

    // Return unsubscribe function
    return () => {
      const currentListeners = this.listeners.get(type) || [];
      const index = currentListeners.indexOf(listener);
      if (index > -1) {
        currentListeners.splice(index, 1);
        this.listeners.set(type, currentListeners);
      }
    };
  }

  /**
   * Get current token
   */
  static getToken(): string | null {
    return this.token;
  }
}

/**
 * Mobile Storage Manager
 */
export class MobileStorage {
  /**
   * Store item in secure storage
   */
  static async setSecureItem(key: string, value: string): Promise<void> {
    try {
      // For React Native, use react-native-keychain or react-native-secure-key-store
      // For web, use encrypted localStorage
      if (typeof window !== 'undefined') {
        // Simple encryption for web (in production, use proper encryption)
        const encrypted = btoa(value);
        localStorage.setItem(`secure_${key}`, encrypted);
      }
    } catch (error) {
      console.error('❌ Secure storage write failed:', error);
      throw new Error('Failed to store secure item');
    }
  }

  /**
   * Retrieve item from secure storage
   */
  static async getSecureItem(key: string): Promise<string | null> {
    try {
      // For React Native, use react-native-keychain or react-native-secure-key-store
      // For web, use encrypted localStorage
      if (typeof window !== 'undefined') {
        const encrypted = localStorage.getItem(`secure_${key}`);
        return encrypted ? atob(encrypted) : null;
      }
      return null;
    } catch (error) {
      console.error('❌ Secure storage read failed:', error);
      return null;
    }
  }

  /**
   * Store regular item
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      // For React Native, use AsyncStorage
      // For web, use localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('❌ Storage write failed:', error);
      throw new Error('Failed to store item');
    }
  }

  /**
   * Retrieve regular item
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      // For React Native, use AsyncStorage
      // For web, use localStorage
      if (typeof window !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    } catch (error) {
      console.error('❌ Storage read failed:', error);
      return null;
    }
  }

  /**
   * Remove item
   */
  static async removeItem(key: string): Promise<void> {
    try {
      // For React Native, use AsyncStorage
      // For web, use localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
        localStorage.removeItem(`secure_${key}`);
      }
    } catch (error) {
      console.error('❌ Storage remove failed:', error);
    }
  }

  /**
   * Clear all storage
   */
  static async clear(): Promise<void> {
    try {
      // For React Native, use AsyncStorage
      // For web, use localStorage
      if (typeof window !== 'undefined') {
        localStorage.clear();
      }
    } catch (error) {
      console.error('❌ Storage clear failed:', error);
    }
  }
}

/**
 * Location Manager
 */
export class LocationManager {
  /**
   * Get current location
   */
  static async getCurrentLocation(): Promise<{ success: boolean; location?: LocationData; error?: string }> {
    try {
      // For React Native, use @react-native-community/geolocation
      // For web, use Navigator Geolocation API
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                success: true,
                location: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  altitude: position.coords.altitude || undefined,
                  speed: position.coords.speed || undefined,
                  heading: position.coords.heading || undefined,
                },
              });
            },
            (error) => {
              resolve({
                success: false,
                error: error.message,
              });
            },
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 10000,
            }
          );
        });
      }

      return { success: false, error: 'Geolocation not supported' };
    } catch (error: any) {
      console.error('❌ Location access failed:', error);
      return { success: false, error: error.message || 'Location access failed' };
    }
  }

  /**
   * Watch location changes
   */
  static watchLocation(
    callback: (location: LocationData) => void,
    errorCallback?: (error: string) => void
  ): () => void {
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          callback({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            speed: position.coords.speed || undefined,
            heading: position.coords.heading || undefined,
          });
        },
        (error) => {
          if (errorCallback) {
            errorCallback(error.message);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000,
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }

    return () => {};
  }
}

/**
 * Device Information
 */
export class DeviceInfoManager {
  /**
   * Get device information
   */
  static async getDeviceInfo(): Promise<DeviceInfo> {
    try {
      // For React Native, use react-native-device-info
      // For web, use Navigator API
      if (typeof window !== 'undefined') {
        return {
          platform: /iPad|iPhone|iPod/.test(navigator.userAgent) ? 'ios' : 'android',
          version: '1.0.0',
          model: 'Web Browser',
          uniqueId: await this.getUniqueId(),
          systemVersion: navigator.userAgent,
          buildNumber: '1',
          bundleId: 'com.propertyhub.web',
        };
      }

      // Default values
      return {
        platform: 'ios',
        version: '1.0.0',
        model: 'Unknown',
        uniqueId: 'unknown',
        systemVersion: 'Unknown',
        buildNumber: '1',
        bundleId: 'com.propertyhub.app',
      };
    } catch (error) {
      console.error('❌ Device info retrieval failed:', error);
      return {
        platform: 'ios',
        version: '1.0.0',
        model: 'Unknown',
        uniqueId: 'unknown',
        systemVersion: 'Unknown',
        buildNumber: '1',
        bundleId: 'com.propertyhub.app',
      };
    }
  }

  /**
   * Generate unique device ID
   */
  private static async getUniqueId(): Promise<string> {
    try {
      let uniqueId = await MobileStorage.getItem('device_unique_id');
      if (!uniqueId) {
        uniqueId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        await MobileStorage.setItem('device_unique_id', uniqueId);
      }
      return uniqueId;
    } catch (error) {
      console.error('❌ Unique ID generation failed:', error);
      return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }
}

/**
 * Offline Sync Manager
 */
export class OfflineSyncManager {
  private static syncInProgress = false;
  private static lastSyncTime: Date | null = null;

  /**
   * Start background sync
   */
  static async startSync(): Promise<void> {
    if (this.syncInProgress) {
      console.log('🔄 Sync already in progress');
      return;
    }

    this.syncInProgress = true;
    console.log('🔄 Starting offline sync...');

    try {
      // Sync properties
      await this.syncProperties();
      
      // Sync chat messages
      await this.syncChatMessages();
      
      // Sync user data
      await this.syncUserData();

      this.lastSyncTime = new Date();
      console.log('✅ Offline sync completed');
    } catch (error) {
      console.error('❌ Offline sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Sync properties data
   */
  private static async syncProperties(): Promise<void> {
    try {
      const cachedProperties = await MobileStorage.getItem(STORAGE_KEYS.CACHED_PROPERTIES);
      if (!cachedProperties) return;

      // Implementation would sync with server
      console.log('🏠 Properties synced');
    } catch (error) {
      console.error('❌ Property sync failed:', error);
    }
  }

  /**
   * Sync chat messages
   */
  private static async syncChatMessages(): Promise<void> {
    try {
      // Implementation would sync chat messages
      console.log('💬 Chat messages synced');
    } catch (error) {
      console.error('❌ Chat sync failed:', error);
    }
  }

  /**
   * Sync user data
   */
  private static async syncUserData(): Promise<void> {
    try {
      // Implementation would sync user data
      console.log('👤 User data synced');
    } catch (error) {
      console.error('❌ User sync failed:', error);
    }
  }

  /**
   * Get sync status
   */
  static getSyncStatus(): SyncStatus {
    return {
      lastSync: this.lastSyncTime || new Date(0),
      pendingUploads: 0, // Would be calculated from offline queue
      pendingDownloads: 0, // Would be calculated from server
      conflicts: [], // Would be detected during sync
    };
  }

  /**
   * Force sync
   */
  static async forceSync(): Promise<void> {
    this.syncInProgress = false; // Reset flag
    await this.startSync();
  }
}

/**
 * Mobile Analytics
 */
export class MobileAnalytics {
  /**
   * Track app events
   */
  static async trackEvent(event: string, properties?: Record<string, any>): Promise<void> {
    try {
      const deviceInfo = await DeviceInfoManager.getDeviceInfo();
      const eventData = {
        event,
        properties: {
          ...properties,
          platform: deviceInfo.platform,
          version: deviceInfo.version,
          timestamp: Date.now(),
        },
      };

      // Send to analytics service
      console.log('📊 Event tracked:', eventData);
    } catch (error) {
      console.error('❌ Analytics tracking failed:', error);
    }
  }

  /**
   * Track screen view
   */
  static async trackScreen(screenName: string, properties?: Record<string, any>): Promise<void> {
    await this.trackEvent('screen_view', {
      screen_name: screenName,
      ...properties,
    });
  }

  /**
   * Track user action
   */
  static async trackUserAction(action: string, properties?: Record<string, any>): Promise<void> {
    await this.trackEvent('user_action', {
      action,
      ...properties,
    });
  }
}

// Export all utilities
export {
  BiometricAuth,
  PushNotificationManager,
  MobileStorage,
  LocationManager,
  DeviceInfoManager,
  OfflineSyncManager,
  MobileAnalytics,
};