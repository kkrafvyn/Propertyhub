/**
 * React Native Backend Provider
 * 
 * React context provider for React Native backend integration
 * Provides backend services to React components with proper error handling
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { toast } from "sonner";

// Safe import with error handling
let reactNativeBackend: any = null;
let ReactNativeBackendManager: any = null;

try {
  const backendModule = require('../../../backend/react-native');
  reactNativeBackend = backendModule.reactNativeBackend;
  ReactNativeBackendManager = backendModule.ReactNativeBackendManager;
} catch (error) {
  console.warn('⚠️ React Native backend not available, using fallback:', error);
  try {
    const fallbackModule = require('../../../backend/react-native/fallback');
    reactNativeBackend = fallbackModule.default.reactNativeBackend;
  } catch (fallbackError) {
    console.warn('⚠️ Fallback also failed:', fallbackError);
  }
}

export interface ConnectionStatus {
  connected: boolean;
  connecting: boolean;
  reconnectAttempts: number;
  lastError?: string;
  lastConnected?: Date;
  lastDisconnected?: Date;
}

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  conflicts: number;
  phase: 'download' | 'upload' | 'conflicts' | 'complete';
}

export interface SyncConflict {
  id: string;
  type: string;
  localData: any;
  serverData: any;
  localTimestamp: number;
  serverTimestamp: number;
  resolved: boolean;
  resolution?: 'local' | 'server' | 'merge';
}

export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
}

export interface ReactNativeBackendContextValue {
  // Backend Manager
  backend: any;
  
  // Status
  isInitialized: boolean;
  isOnline: boolean;
  connectionStatus: ConnectionStatus | null;
  syncProgress: SyncProgress | null;
  
  // Authentication
  login: (email: string, password: string, rememberMe?: boolean) => Promise<any>;
  biometricLogin: (userId: string) => Promise<any>;
  logout: () => Promise<void>;
  
  // Location
  getCurrentLocation: () => Promise<{ success: boolean; location?: LocationData; error?: string }>;
  
  // Push Notifications
  sendNotification: (title: string, body: string, data?: any) => Promise<void>;
  
  // Analytics
  trackEvent: (event: string, properties?: any) => Promise<void>;
  trackScreen: (screenName: string, properties?: any) => Promise<void>;
  
  // Data Sync
  forceSync: () => Promise<void>;
  getSyncConflicts: () => SyncConflict[];
  resolveConflict: (conflictId: string, resolution: 'local' | 'server' | 'merge', mergedData?: any) => Promise<void>;
  
  // Debug
  getDebugInfo: () => any;
  testServices: () => Promise<any>;
}

const ReactNativeBackendContext = createContext<ReactNativeBackendContextValue | null>(null);

export interface ReactNativeBackendProviderProps {
  children: React.ReactNode;
  autoInitialize?: boolean;
  initOptions?: {
    authToken?: string;
    enablePushNotifications?: boolean;
    enableBiometric?: boolean;
    enableLocation?: boolean;
    enableAnalytics?: boolean;
    autoSync?: boolean;
  };
}

/**
 * Mock backend implementation for when React Native backend is not available
 */
const createMockBackend = () => ({
  isInitialized: () => false,
  initialize: async () => ({ success: false, error: 'Backend not available' }),
  login: async () => ({ success: false, error: 'Backend not available' }),
  biometricLogin: async () => ({ success: false, error: 'Backend not available' }),
  logout: async () => {},
  getCurrentLocation: async () => ({ success: false, error: 'Backend not available' }),
  sendNotification: async () => {},
  trackEvent: async () => {},
  forceSync: async () => {},
  getConnectionStatus: () => ({ connected: false, connecting: false, reconnectAttempts: 0 }),
  getSyncStatus: () => ({ total: 0, completed: 0, failed: 0, conflicts: 0, phase: 'complete' }),
});

/**
 * React Native Backend Provider Component
 */
export function ReactNativeBackendProvider({ 
  children, 
  autoInitialize = true,
  initOptions = {} 
}: ReactNativeBackendProviderProps): JSX.Element {
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [backend, setBackend] = useState<any>(null);

  // Initialize backend on mount
  useEffect(() => {
    if (autoInitialize) {
      initializeBackend();
    }
  }, [autoInitialize]);

  // Monitor online status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('🌐 Connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('📵 Connection lost');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initialize backend
  const initializeBackend = useCallback(async () => {
    try {
      console.log('🚀 Initializing React Native backend...');

      if (!reactNativeBackend) {
        console.warn('⚠️ React Native backend not available, using mock implementation');
        setBackend(createMockBackend());
        setIsInitialized(false);
        return;
      }
      
      await reactNativeBackend.initialize(initOptions);
      setBackend(reactNativeBackend);
      setIsInitialized(true);
      
      // Setup event listeners if backend is available
      try {
        const webSocket = reactNativeBackend.getWebSocketManager();
        
        webSocket.on('connect', () => {
          setConnectionStatus(webSocket.getStatus());
          toast.success('🔌 Connected to server');
        });
        
        webSocket.on('disconnect', () => {
          setConnectionStatus(webSocket.getStatus());
          toast.info('🔌 Disconnected from server');
        });
        
        webSocket.on('error', (error: any) => {
          setConnectionStatus(webSocket.getStatus());
          toast.error(`Connection error: ${error.message}`);
        });
        
        // Setup sync monitoring
        const syncService = reactNativeBackend.getSyncService();
        
        syncService.on('sync_start', () => {
          setSyncProgress(syncService.getSyncProgress());
          toast.info('🔄 Starting data sync...');
        });
        
        syncService.on('sync_complete', (result: any) => {
          setSyncProgress(syncService.getSyncProgress());
          toast.success(`✅ Sync completed in ${result.duration}ms`);
        });
        
        syncService.on('sync_error', (error: any) => {
          setSyncProgress(syncService.getSyncProgress());
          toast.error(`❌ Sync failed: ${error.message}`);
        });
        
        syncService.on('sync_conflict', (conflict: any) => {
          setConflicts(syncService.getConflicts());
          toast.warning(`⚠️ Sync conflict detected: ${conflict.type} ${conflict.id}`);
        });
        
        syncService.on('realtime_update', (update: any) => {
          toast.info(`📡 Real-time update: ${update.type} ${update.action}`);
        });
      } catch (error) {
        console.warn('⚠️ Could not setup event listeners:', error);
      }
      
      toast.success('✅ Backend initialized successfully');
      console.log('✅ React Native backend initialized');
      
    } catch (error: any) {
      console.error('❌ Failed to initialize backend:', error);
      toast.error(`Failed to initialize backend: ${error.message}`);
      setBackend(createMockBackend());
      setIsInitialized(false);
    }
  }, [initOptions]);

  // Authentication methods
  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    try {
      if (!backend) {
        return { success: false, error: 'Backend not available' };
      }

      const result = await backend.login(email, password, rememberMe);
      
      if (result.success) {
        toast.success('✅ Login successful');
        
        // Update connection status if available
        try {
          const webSocket = backend.getWebSocketManager();
          setConnectionStatus(webSocket.getStatus());
        } catch (error) {
          // Ignore websocket status errors
        }
      } else {
        toast.error(`❌ Login failed: ${result.error}`);
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Login error:', error);
      toast.error(`Login error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }, [backend]);

  const biometricLogin = useCallback(async (userId: string) => {
    try {
      if (!backend) {
        return { success: false, error: 'Backend not available' };
      }

      const result = await backend.biometricLogin(userId);
      
      if (result.success) {
        toast.success('✅ Biometric login successful');
        
        // Update connection status if available
        try {
          const webSocket = backend.getWebSocketManager();
          setConnectionStatus(webSocket.getStatus());
        } catch (error) {
          // Ignore websocket status errors
        }
      } else {
        toast.error(`❌ Biometric login failed: ${result.error}`);
      }
      
      return result;
    } catch (error: any) {
      console.error('❌ Biometric login error:', error);
      toast.error(`Biometric login error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }, [backend]);

  const logout = useCallback(async () => {
    try {
      if (!backend) return;
      
      await backend.logout();
      setConnectionStatus(null);
      setSyncProgress(null);
      setConflicts([]);
      toast.success('👋 Logged out successfully');
    } catch (error: any) {
      console.error('❌ Logout error:', error);
      toast.error(`Logout error: ${error.message}`);
    }
  }, [backend]);

  // Location methods
  const getCurrentLocation = useCallback(async () => {
    try {
      if (!backend) {
        return { success: false, error: 'Backend not available' };
      }
      
      return await backend.getCurrentLocation();
    } catch (error: any) {
      console.error('❌ Location error:', error);
      return { success: false, error: error.message };
    }
  }, [backend]);

  // Push notification methods
  const sendNotification = useCallback(async (title: string, body: string, data?: any) => {
    try {
      if (!backend) return;
      
      await backend.sendNotification(title, body, data);
    } catch (error: any) {
      console.error('❌ Notification error:', error);
      toast.error(`Notification error: ${error.message}`);
    }
  }, [backend]);

  // Analytics methods
  const trackEvent = useCallback(async (event: string, properties?: any) => {
    try {
      if (!backend) return;
      
      await backend.trackEvent(event, properties);
    } catch (error: any) {
      console.error('❌ Analytics tracking error:', error);
    }
  }, [backend]);

  const trackScreen = useCallback(async (screenName: string, properties?: any) => {
    try {
      if (!backend) return;
      
      const analytics = backend.getAnalytics();
      await analytics.trackScreen(screenName, properties);
    } catch (error: any) {
      console.error('❌ Screen tracking error:', error);
    }
  }, [backend]);

  // Data sync methods
  const forceSync = useCallback(async () => {
    try {
      if (!backend) return;
      
      await backend.forceSync();
    } catch (error: any) {
      console.error('❌ Force sync error:', error);
      toast.error(`Sync error: ${error.message}`);
    }
  }, [backend]);

  const getSyncConflicts = useCallback(() => {
    try {
      if (!backend) return [];
      
      const syncService = backend.getSyncService();
      return syncService.getConflicts();
    } catch (error) {
      console.error('❌ Get conflicts error:', error);
      return [];
    }
  }, [backend]);

  const resolveConflict = useCallback(async (
    conflictId: string, 
    resolution: 'local' | 'server' | 'merge', 
    mergedData?: any
  ) => {
    try {
      if (!backend) return;
      
      const syncService = backend.getSyncService();
      await syncService.resolveConflictManually(conflictId, resolution, mergedData);
      setConflicts(syncService.getConflicts());
      toast.success(`✅ Conflict resolved: ${resolution}`);
    } catch (error: any) {
      console.error('❌ Resolve conflict error:', error);
      toast.error(`Conflict resolution error: ${error.message}`);
    }
  }, [backend]);

  // Debug methods
  const getDebugInfo = useCallback(() => {
    try {
      if (!backend) {
        return { error: 'Backend not available' };
      }
      
      return {
        initialized: isInitialized,
        online: isOnline,
        connectionStatus,
        syncProgress,
        conflictsCount: conflicts.length,
        backendType: reactNativeBackend ? 'real' : 'mock'
      };
    } catch (error) {
      console.error('❌ Debug info error:', error);
      return { error: 'Debug info not available' };
    }
  }, [isInitialized, isOnline, connectionStatus, syncProgress, conflicts]);

  const testServices = useCallback(async () => {
    try {
      if (!backend) {
        return { 
          backend: 'not available',
          location: 'not available',
          notifications: 'not available',
          biometric: 'not available'
        };
      }
      
      const results: any = {
        backend: isInitialized ? 'available' : 'not available',
      };
      
      // Test location
      try {
        const location = await getCurrentLocation();
        results.location = location.success ? 'working' : 'failed';
      } catch {
        results.location = 'not available';
      }
      
      // Test notifications
      try {
        results.notifications = 'Notification' in window ? 'available' : 'not available';
      } catch {
        results.notifications = 'not available';
      }
      
      // Test biometric
      try {
        results.biometric = 'credentials' in navigator ? 'available' : 'not available';
      } catch {
        results.biometric = 'not available';
      }
      
      return results;
    } catch (error: any) {
      console.error('❌ Service test error:', error);
      return { error: error.message };
    }
  }, [backend, isInitialized, getCurrentLocation]);

  // Context value
  const contextValue: ReactNativeBackendContextValue = {
    backend: backend || createMockBackend(),
    isInitialized,
    isOnline,
    connectionStatus,
    syncProgress,
    login,
    biometricLogin,
    logout,
    getCurrentLocation,
    sendNotification,
    trackEvent,
    trackScreen,
    forceSync,
    getSyncConflicts,
    resolveConflict,
    getDebugInfo,
    testServices,
  };

  return (
    <ReactNativeBackendContext.Provider value={contextValue}>
      {children}
    </ReactNativeBackendContext.Provider>
  );
}

/**
 * Hook to use React Native backend context
 */
export function useReactNativeBackend(): ReactNativeBackendContextValue {
  const context = useContext(ReactNativeBackendContext);
  
  if (!context) {
    throw new Error('useReactNativeBackend must be used within a ReactNativeBackendProvider');
  }
  
  return context;
}

/**
 * Hook for authentication with React Native backend
 */
export function useReactNativeAuth() {
  const { login, biometricLogin, logout, isInitialized } = useReactNativeBackend();
  
  return {
    login,
    biometricLogin,
    logout,
    isInitialized,
  };
}

/**
 * Hook for location services with React Native backend
 */
export function useReactNativeLocation() {
  const { getCurrentLocation, trackEvent } = useReactNativeBackend();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getLocation = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getCurrentLocation();
      
      if (result.success && result.location) {
        setLocation(result.location);
        await trackEvent('location_accessed', {
          accuracy: result.location.accuracy,
        });
      } else {
        setError(result.error || 'Failed to get location');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getCurrentLocation, trackEvent]);

  return {
    location,
    loading,
    error,
    getLocation,
  };
}

/**
 * Hook for push notifications with React Native backend
 */
export function useReactNativePushNotifications() {
  const { sendNotification, trackEvent } = useReactNativeBackend();

  const sendLocalNotification = useCallback(async (
    title: string, 
    body: string, 
    data?: any
  ) => {
    try {
      await sendNotification(title, body, data);
      await trackEvent('local_notification_sent', {
        title,
        has_data: !!data,
      });
    } catch (error: any) {
      console.error('❌ Send notification error:', error);
      throw error;
    }
  }, [sendNotification, trackEvent]);

  return {
    sendLocalNotification,
  };
}

/**
 * Hook for data sync with React Native backend
 */
export function useReactNativeSync() {
  const { 
    syncProgress, 
    forceSync, 
    getSyncConflicts, 
    resolveConflict,
    trackEvent 
  } = useReactNativeBackend();

  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);

  // Update conflicts when sync progress changes
  useEffect(() => {
    setConflicts(getSyncConflicts());
  }, [syncProgress, getSyncConflicts]);

  const startSync = useCallback(async () => {
    try {
      await forceSync();
      await trackEvent('manual_sync_triggered');
    } catch (error: any) {
      console.error('❌ Manual sync error:', error);
      throw error;
    }
  }, [forceSync, trackEvent]);

  const resolveConflictWithTracking = useCallback(async (
    conflictId: string, 
    resolution: 'local' | 'server' | 'merge', 
    mergedData?: any
  ) => {
    try {
      await resolveConflict(conflictId, resolution, mergedData);
      await trackEvent('sync_conflict_resolved', {
        conflict_id: conflictId,
        resolution,
        has_merged_data: !!mergedData,
      });
    } catch (error: any) {
      console.error('❌ Conflict resolution error:', error);
      throw error;
    }
  }, [resolveConflict, trackEvent]);

  return {
    syncProgress,
    conflicts,
    startSync,
    resolveConflict: resolveConflictWithTracking,
    isSyncing: syncProgress?.phase !== 'complete',
  };
}

export default ReactNativeBackendProvider;
