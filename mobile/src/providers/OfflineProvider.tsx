/**
 * PropertyHub Mobile - Offline Provider
 * 
 * Manages offline state, data caching, and sync functionality
 * for the mobile app to work seamlessly without internet.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
interface OfflineContextType {
  isOffline: boolean;
  isConnected: boolean;
  connectionType: string | null;
  syncPendingData: () => Promise<void>;
  cacheData: (key: string, data: any) => Promise<void>;
  getCachedData: (key: string) => Promise<any>;
  clearCache: () => Promise<void>;
  pendingActions: any[];
  addPendingAction: (action: any) => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

const CACHE_KEYS = {
  PROPERTIES: 'cached_properties',
  USER_DATA: 'cached_user_data',
  CHAT_MESSAGES: 'cached_chat_messages',
  SEARCH_RESULTS: 'cached_search_results',
  PENDING_ACTIONS: 'pending_actions',
};

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOffline, setIsOffline] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [connectionType, setConnectionType] = useState<string | null>(null);
  const [pendingActions, setPendingActions] = useState<any[]>([]);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      console.log('🌐 Network state changed:', state);
      
      setIsConnected(state.isConnected ?? false);
      setIsOffline(!state.isConnected);
      setConnectionType(state.type);

      // If we're back online, sync pending data
      if (state.isConnected && !isConnected) {
        console.log('🌐 Back online, syncing pending data...');
        syncPendingData();
      }
    });

    // Load pending actions from storage
    loadPendingActions();

    return () => {
      unsubscribe();
    };
  }, [isConnected]);

  const loadPendingActions = async () => {
    try {
      const stored = await AsyncStorage.getItem(CACHE_KEYS.PENDING_ACTIONS);
      if (stored) {
        const actions = JSON.parse(stored);
        setPendingActions(actions);
        console.log('📂 Loaded pending actions:', actions.length);
      }
    } catch (error) {
      console.error('📂 Error loading pending actions:', error);
    }
  };

  const savePendingActions = async (actions: any[]) => {
    try {
      await AsyncStorage.setItem(CACHE_KEYS.PENDING_ACTIONS, JSON.stringify(actions));
    } catch (error) {
      console.error('📂 Error saving pending actions:', error);
    }
  };

  const addPendingAction = (action: any) => {
    const newAction = {
      ...action,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };

    const updatedActions = [...pendingActions, newAction];
    setPendingActions(updatedActions);
    savePendingActions(updatedActions);
    
    console.log('📂 Added pending action:', newAction);
  };

  const syncPendingData = async () => {
    if (pendingActions.length === 0) {
      console.log('📂 No pending actions to sync');
      return;
    }

    console.log(`📂 Syncing ${pendingActions.length} pending actions...`);

    const successfulActions: string[] = [];

    for (const action of pendingActions) {
      try {
        switch (action.type) {
          case 'send_message':
            await syncMessage(action.data);
            successfulActions.push(action.id);
            break;
          
          case 'update_property':
            await syncPropertyUpdate(action.data);
            successfulActions.push(action.id);
            break;
          
          case 'upload_image':
            await syncImageUpload(action.data);
            successfulActions.push(action.id);
            break;
          
          case 'user_action':
            await syncUserAction(action.data);
            successfulActions.push(action.id);
            break;
          
          default:
            console.warn('📂 Unknown action type:', action.type);
            successfulActions.push(action.id); // Remove unknown actions
        }
      } catch (error) {
        console.error(`📂 Failed to sync action ${action.id}:`, error);
      }
    }

    // Remove successful actions
    const remainingActions = pendingActions.filter(
      action => !successfulActions.includes(action.id)
    );

    setPendingActions(remainingActions);
    savePendingActions(remainingActions);

    console.log(`📂 Sync complete: ${successfulActions.length} successful, ${remainingActions.length} remaining`);
  };

  const syncMessage = async (messageData: any) => {
    // Implement message sync logic
    console.log('💬 Syncing message:', messageData);
    // This would typically send the message to your WebSocket server or API
  };

  const syncPropertyUpdate = async (propertyData: any) => {
    // Implement property update sync logic
    console.log('🏠 Syncing property update:', propertyData);
  };

  const syncImageUpload = async (imageData: any) => {
    // Implement image upload sync logic
    console.log('📸 Syncing image upload:', imageData);
  };

  const syncUserAction = async (actionData: any) => {
    // Implement user action sync logic
    console.log('👤 Syncing user action:', actionData);
  };

  const cacheData = async (key: string, data: any) => {
    try {
      const cacheKey = `cache_${key}`;
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        version: '1.0',
      };
      
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
      console.log(`📂 Cached data for key: ${key}`);
    } catch (error) {
      console.error(`📂 Error caching data for key ${key}:`, error);
    }
  };

  const getCachedData = async (key: string) => {
    try {
      const cacheKey = `cache_${key}`;
      const stored = await AsyncStorage.getItem(cacheKey);
      
      if (!stored) {
        return null;
      }

      const cacheEntry = JSON.parse(stored);
      const age = Date.now() - cacheEntry.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      // Return cached data if it's not too old
      if (age < maxAge) {
        console.log(`📂 Retrieved cached data for key: ${key}`);
        return cacheEntry.data;
      } else {
        console.log(`📂 Cached data expired for key: ${key}`);
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }
    } catch (error) {
      console.error(`📂 Error retrieving cached data for key ${key}:`, error);
      return null;
    }
  };

  const clearCache = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('cache_'));
      
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`📂 Cleared ${cacheKeys.length} cache entries`);
    } catch (error) {
      console.error('📂 Error clearing cache:', error);
    }
  };

  const value: OfflineContextType = {
    isOffline,
    isConnected,
    connectionType,
    syncPendingData,
    cacheData,
    getCachedData,
    clearCache,
    pendingActions,
    addPendingAction,
  };

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline() {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
}