/**
 * PropertyHub Mobile - App Initialization Utilities
 * 
 * This module handles all app initialization tasks including:
 * - Font loading
 * - Permission requests
 * - App version checking
 * - Cache setup
 * - Error handling setup
 */

import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import * as Location from 'expo-location';
import * as MediaLibrary from 'expo-media-library';
import * as Camera from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configuration
const CACHE_VERSION = '1.0.0';
const APP_VERSION = '1.0.0';

/**
 * Initialize the mobile application
 */
export async function initializeApp(): Promise<void> {
  try {
    console.log('🚀 Initializing PropertyHub Mobile...');

    // Keep splash screen visible during initialization
    await SplashScreen.preventAutoHideAsync();

    // Run initialization tasks in parallel where possible
    await Promise.all([
      loadFonts(),
      setupCache(),
      checkAppVersion(),
      setupErrorHandling(),
    ]);

    // Request permissions (can be done in parallel)
    await Promise.all([
      requestNotificationPermissions(),
      requestLocationPermissions(),
    ]);

    console.log('✅ PropertyHub Mobile initialization complete');
  } catch (error) {
    console.error('❌ App initialization failed:', error);
    throw error;
  }
}

/**
 * Load custom fonts
 */
async function loadFonts(): Promise<void> {
  try {
    // Add custom fonts here if needed
    await Font.loadAsync({
      // 'CustomFont-Regular': require('../assets/fonts/CustomFont-Regular.ttf'),
      // 'CustomFont-Bold': require('../assets/fonts/CustomFont-Bold.ttf'),
    });
    
    console.log('✅ Fonts loaded');
  } catch (error) {
    console.warn('⚠️ Font loading failed:', error);
    // Don't throw error as fonts are not critical
  }
}

/**
 * Setup application cache
 */
async function setupCache(): Promise<void> {
  try {
    // Check if cache needs to be cleared (version change)
    const cachedVersion = await AsyncStorage.getItem('cache_version');
    
    if (cachedVersion !== CACHE_VERSION) {
      console.log('🧹 Clearing old cache...');
      
      // Clear old cache data
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.startsWith('properties_') ||
        key.startsWith('chat_') ||
        key.startsWith('favorites_') ||
        key.startsWith('search_')
      );
      
      await AsyncStorage.multiRemove(cacheKeys);
      await AsyncStorage.setItem('cache_version', CACHE_VERSION);
      
      console.log('✅ Cache cleared and version updated');
    }
    
    console.log('✅ Cache setup complete');
  } catch (error) {
    console.warn('⚠️ Cache setup failed:', error);
    // Don't throw error as cache is not critical for app startup
  }
}

/**
 * Check app version and compatibility
 */
export async function checkAppVersion(): Promise<void> {
  try {
    // Check minimum supported version from server
    const response = await fetch(process.env.EXPO_PUBLIC_API_URL + '/version/check', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Version': APP_VERSION,
        'X-Platform': Platform.OS,
      },
    });

    if (response.ok) {
      const data = await response.json();
      
      if (data.updateRequired) {
        // Handle required update
        console.warn('⚠️ App update required:', data.message);
        // You could show an update dialog here
      } else if (data.updateAvailable) {
        // Handle optional update
        console.log('ℹ️ App update available:', data.message);
        // You could show an optional update notification
      }
    }
    
    console.log('✅ App version check complete');
  } catch (error) {
    console.warn('⚠️ Version check failed:', error);
    // Don't throw error as version check is not critical
  }
}

/**
 * Setup global error handling
 */
async function setupErrorHandling(): Promise<void> {
  try {
    // Setup global error handler for unhandled promises
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
        // You could send this to your error reporting service
      });
    }

    // Setup React Native error handler
    const originalHandler = ErrorUtils.getGlobalHandler();
    ErrorUtils.setGlobalHandler((error, isFatal) => {
      console.error('Global error handler:', error, 'isFatal:', isFatal);
      // You could send this to your error reporting service
      
      // Call original handler
      originalHandler(error, isFatal);
    });
    
    console.log('✅ Error handling setup complete');
  } catch (error) {
    console.warn('⚠️ Error handling setup failed:', error);
  }
}

/**
 * Request notification permissions
 */
async function requestNotificationPermissions(): Promise<void> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus === 'granted') {
      console.log('✅ Notification permissions granted');
      
      // Configure notification handling
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
      
      // Get push notification token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      
      console.log('📱 Push token:', token.data);
      
      // Store token for sending to server
      await AsyncStorage.setItem('expo_push_token', token.data);
      
    } else {
      console.warn('⚠️ Notification permissions denied');
    }
  } catch (error) {
    console.warn('⚠️ Notification permission request failed:', error);
  }
}

/**
 * Request location permissions
 */
async function requestLocationPermissions(): Promise<void> {
  try {
    const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Location.requestForegroundPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus === 'granted') {
      console.log('✅ Location permissions granted');
      
      // Optionally request background location permissions
      if (Platform.OS === 'ios') {
        const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
        if (backgroundStatus === 'granted') {
          console.log('✅ Background location permissions granted');
        }
      }
    } else {
      console.warn('⚠️ Location permissions denied');
    }
  } catch (error) {
    console.warn('⚠️ Location permission request failed:', error);
  }
}

/**
 * Request camera and media library permissions
 */
export async function requestMediaPermissions(): Promise<{
  camera: boolean;
  mediaLibrary: boolean;
}> {
  try {
    const [cameraResult, mediaResult] = await Promise.all([
      Camera.requestCameraPermissionsAsync(),
      MediaLibrary.requestPermissionsAsync(),
    ]);

    const permissions = {
      camera: cameraResult.status === 'granted',
      mediaLibrary: mediaResult.status === 'granted',
    };

    console.log('📷 Media permissions:', permissions);
    return permissions;
  } catch (error) {
    console.warn('⚠️ Media permission request failed:', error);
    return { camera: false, mediaLibrary: false };
  }
}

/**
 * Clear all app data (useful for development/testing)
 */
export async function clearAppData(): Promise<void> {
  try {
    console.log('🧹 Clearing all app data...');
    
    // Clear AsyncStorage
    await AsyncStorage.clear();
    
    // Clear secure storage would require individual key deletion
    // as there's no clear all method
    
    console.log('✅ App data cleared');
  } catch (error) {
    console.error('❌ Failed to clear app data:', error);
    throw error;
  }
}

/**
 * Get app info
 */
export function getAppInfo(): {
  version: string;
  platform: string;
  cacheVersion: string;
} {
  return {
    version: APP_VERSION,
    platform: Platform.OS,
    cacheVersion: CACHE_VERSION,
  };
}