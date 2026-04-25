import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Wifi, WifiOff, Download, Trash2, HardDrive, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';

export interface CachedProperty {
  id: string;
  title: string;
  price: number;
  location: string;
  image: string;
  bedrooms: number;
  bathrooms: number;
  description: string;
  cachedAt: Date;
  size: number; // in bytes
}

export interface OfflineSyncState {
  isOnline: boolean;
  pendingChanges: Array<{
    id: string;
    type: 'create' | 'update' | 'delete';
    data: any;
    timestamp: Date;
  }>;
  lastSyncTime?: Date;
  syncInProgress: boolean;
  cacheSize: number; // in bytes
  cachedProperties: CachedProperty[];
}

const OFFLINE_STORAGE_KEY = 'realestate_offline_cache';
const PENDING_CHANGES_KEY = 'realestate_pending_changes';

// Utility functions
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

// Hook for offline functionality
export const useOfflineSync = () => {
  const [state, setState] = useState<OfflineSyncState>({
    isOnline: navigator.onLine,
    pendingChanges: [],
    syncInProgress: false,
    cacheSize: 0,
    cachedProperties: [],
  });

  // Load from storage on mount
  useEffect(() => {
    const cached = localStorage.getItem(OFFLINE_STORAGE_KEY);
    const pending = localStorage.getItem(PENDING_CHANGES_KEY);

    if (cached) {
      const properties = JSON.parse(cached) as CachedProperty[];
      const cacheSize = properties.reduce((sum, p) => sum + (p.size || 0), 0);
      setState(prev => ({ ...prev, cachedProperties: properties, cacheSize }));
    }

    if (pending) {
      setState(prev => ({
        ...prev,
        pendingChanges: JSON.parse(pending),
      }));
    }
  }, []);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      toast.success('You are back online');
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      toast.info('You are offline. Changes will sync when back online.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const cacheProperty = useCallback((property: CachedProperty) => {
    setState(prev => {
      const updated = prev.cachedProperties.filter(p => p.id !== property.id);
      updated.push(property);
      
      const cacheSize = updated.reduce((sum, p) => sum + (p.size || 0), 0);
      
      // Save to storage
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updated));
      
      return {
        ...prev,
        cachedProperties: updated,
        cacheSize,
      };
    });
    toast.success('Property cached for offline use');
  }, []);

  const uncacheProperty = useCallback((propertyId: string) => {
    setState(prev => {
      const updated = prev.cachedProperties.filter(p => p.id !== propertyId);
      const cacheSize = updated.reduce((sum, p) => sum + (p.size || 0), 0);
      
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(updated));
      
      return {
        ...prev,
        cachedProperties: updated,
        cacheSize,
      };
    });
    toast.success('Property removed from offline cache');
  }, []);

  const clearCache = useCallback(() => {
    setState(prev => ({
      ...prev,
      cachedProperties: [],
      cacheSize: 0,
    }));
    localStorage.removeItem(OFFLINE_STORAGE_KEY);
    toast.success('Offline cache cleared');
  }, []);

  const addPendingChange = useCallback((type: 'create' | 'update' | 'delete', data: any) => {
    setState(prev => {
      const updated = [
        ...prev.pendingChanges,
        {
          id: `change_${Date.now()}`,
          type,
          data,
          timestamp: new Date(),
        },
      ];
      localStorage.setItem(PENDING_CHANGES_KEY, JSON.stringify(updated));
      return { ...prev, pendingChanges: updated };
    });
  }, []);

  const sync = useCallback(async () => {
    if (!state.isOnline || state.pendingChanges.length === 0) {
      return;
    }

    setState(prev => ({ ...prev, syncInProgress: true }));

    try {
      // Simulate syncing pending changes
      await new Promise(resolve => setTimeout(resolve, 2000));

      setState(prev => ({
        ...prev,
        pendingChanges: [],
        lastSyncTime: new Date(),
        syncInProgress: false,
      }));

      localStorage.removeItem(PENDING_CHANGES_KEY);
      toast.success(`Synced ${state.pendingChanges.length} changes`);
    } catch (error) {
      setState(prev => ({ ...prev, syncInProgress: false }));
      toast.error('Sync failed. Will retry when online.');
    }
  }, [state.isOnline, state.pendingChanges.length]);

  return {
    ...state,
    cacheProperty,
    uncacheProperty,
    clearCache,
    addPendingChange,
    sync,
  };
};

// Offline Status Component
export const OfflineIndicator: React.FC<{
  isOnline: boolean;
  pendingChangeCount?: number;
}> = ({ isOnline, pendingChangeCount = 0 }) => {
  if (isOnline && pendingChangeCount === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed top-4 right-4 z-50"
    >
      <Card className={!isOnline ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'}>
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                  {pendingChangeCount} pending change{pendingChangeCount !== 1 ? 's' : ''} to sync
                </span>
              </>
            ) : (
              <>
                <WifiOff className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-800">You are offline</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Offline Management Component
export const OfflineManager: React.FC<{
  state: OfflineSyncState;
  onClearCache: () => void;
  onSync: () => void;
  onRemoveProperty: (id: string) => void;
}> = ({ state, onClearCache, onSync, onRemoveProperty }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Offline Mode</h2>
        <p className="text-gray-600">Manage cached properties and offline data</p>
      </div>

      {/* Status Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Connection</p>
              <div className="flex items-center gap-2">
                {state.isOnline ? (
                  <>
                    <Wifi className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-green-600">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-5 h-5 text-red-600" />
                    <span className="font-bold text-red-600">Offline</span>
                  </>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Cache Size</p>
              <p className="font-bold">{formatBytes(state.cacheSize)}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Cached Items</p>
              <p className="font-bold">{state.cachedProperties.length}</p>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-1">Pending Changes</p>
              <p className="font-bold">{state.pendingChanges.length}</p>
            </div>
          </div>

          {state.lastSyncTime && (
            <p className="text-xs text-gray-500 mt-4">
              Last synced: {new Date(state.lastSyncTime).toLocaleString()}
            </p>
          )}

          <div className="flex gap-2 mt-6">
            {state.pendingChanges.length > 0 && (
              <Button
                onClick={onSync}
                disabled={!state.isOnline || state.syncInProgress}
                className="flex-1"
              >
                {state.syncInProgress ? 'Syncing...' : 'Sync Changes'}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={onClearCache}
              className="flex-1"
            >
              Clear Cache
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pending Changes */}
      {state.pendingChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              Pending Changes ({state.pendingChanges.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {state.pendingChanges.map((change) => (
                <div
                  key={change.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded"
                >
                  <div>
                    <Badge variant="outline" className="capitalize">
                      {change.type}
                    </Badge>
                    <p className="text-xs text-gray-600 mt-1">
                      {new Date(change.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cached Properties */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="w-5 h-5" />
            Cached Properties ({state.cachedProperties.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {state.cachedProperties.length === 0 ? (
            <p className="text-gray-500 text-sm">No properties cached yet</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {state.cachedProperties.map((property) => (
                <motion.div
                  key={property.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start justify-between p-3 bg-gray-50 rounded"
                >
                  <div>
                    <h4 className="font-semibold text-sm">{property.title}</h4>
                    <p className="text-xs text-gray-600">{property.location}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Size: {formatBytes(property.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemoveProperty(property.id)}
                    className="p-2 hover:bg-red-100 rounded text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Offline Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium mb-1">📱 Cache Important Properties</p>
            <p className="text-gray-600">
              Download properties you're interested in so you can view them offline
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">🔄 Auto-Sync</p>
            <p className="text-gray-600">
              Changes made offline are automatically synced when you're back online
            </p>
          </div>
          <div>
            <p className="font-medium mb-1">💾 Storage Management</p>
            <p className="text-gray-600">
              Monitor your cache size to keep your device running smoothly
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OfflineManager;
