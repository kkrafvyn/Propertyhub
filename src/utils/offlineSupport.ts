import { toast } from "sonner";

interface OfflineAction {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

class OfflineSupport {
  private dbName = 'PropertyHubOffline';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init() {
    if (!('indexedDB' in window)) {
      console.warn('IndexedDB not supported');
      return;
    }

    try {
      this.db = await this.openDatabase();
      console.log('Offline support initialized');
    } catch (error) {
      console.error('Failed to initialize offline support:', error);
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores
        if (!db.objectStoreNames.contains('offline-actions')) {
          const store = db.createObjectStore('offline-actions', { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('retryCount', 'retryCount');
        }

        if (!db.objectStoreNames.contains('cached-data')) {
          const store = db.createObjectStore('cached-data', { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp');
          store.createIndex('expires', 'expires');
        }

        if (!db.objectStoreNames.contains('user-preferences')) {
          db.createObjectStore('user-preferences', { keyPath: 'userId' });
        }
      };
    });
  }

  async queueAction(
    url: string,
    method: string = 'GET',
    headers: Record<string, string> = {},
    body?: string,
    maxRetries: number = 3
  ): Promise<string> {
    if (!this.db) {
      await this.init();
    }

    const action: OfflineAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url,
      method,
      headers,
      body,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries
    };

    try {
      const transaction = this.db!.transaction(['offline-actions'], 'readwrite');
      const store = transaction.objectStore('offline-actions');
      await new Promise((resolve, reject) => {
        const request = store.add(action);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      console.log('Queued offline action:', action.id);
      return action.id;
    } catch (error) {
      console.error('Failed to queue offline action:', error);
      throw error;
    }
  }

  async syncOfflineActions(): Promise<void> {
    if (!this.db || !navigator.onLine) {
      return;
    }

    try {
      const transaction = this.db.transaction(['offline-actions'], 'readwrite');
      const store = transaction.objectStore('offline-actions');
      
      const actions = await new Promise<OfflineAction[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      let syncedCount = 0;
      let failedCount = 0;

      for (const action of actions) {
        try {
          const response = await fetch(action.url, {
            method: action.method,
            headers: action.headers,
            body: action.body
          });

          if (response.ok) {
            // Remove successful action
            const deleteRequest = store.delete(action.id);
            await new Promise((resolve, reject) => {
              deleteRequest.onsuccess = () => resolve(deleteRequest.result);
              deleteRequest.onerror = () => reject(deleteRequest.error);
            });
            
            syncedCount++;
            console.log('Synced offline action:', action.id);
          } else {
            throw new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          console.error('Failed to sync action:', action.id, error);
          
          // Increment retry count
          action.retryCount++;
          
          if (action.retryCount >= action.maxRetries) {
            // Remove action if max retries exceeded
            const deleteRequest = store.delete(action.id);
            await new Promise((resolve, reject) => {
              deleteRequest.onsuccess = () => resolve(deleteRequest.result);
              deleteRequest.onerror = () => reject(deleteRequest.error);
            });
            
            failedCount++;
          } else {
            // Update retry count
            const updateRequest = store.put(action);
            await new Promise((resolve, reject) => {
              updateRequest.onsuccess = () => resolve(updateRequest.result);
              updateRequest.onerror = () => reject(updateRequest.error);
            });
          }
        }
      }

      if (syncedCount > 0 || failedCount > 0) {
        const message = `Sync complete: ${syncedCount} succeeded${failedCount > 0 ? `, ${failedCount} failed` : ''}`;
        toast.success(message);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Failed to sync offline changes');
    }
  }

  async cacheData(key: string, data: any, ttl: number = 3600000): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    try {
      const cacheEntry = {
        key,
        data: JSON.stringify(data),
        timestamp: Date.now(),
        expires: Date.now() + ttl
      };

      const transaction = this.db!.transaction(['cached-data'], 'readwrite');
      const store = transaction.objectStore('cached-data');
      
      await new Promise((resolve, reject) => {
        const request = store.put(cacheEntry);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  async getCachedData(key: string): Promise<any | null> {
    if (!this.db) {
      await this.init();
    }

    try {
      const transaction = this.db!.transaction(['cached-data'], 'readonly');
      const store = transaction.objectStore('cached-data');
      
      const cacheEntry = await new Promise<any>((resolve, reject) => {
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!cacheEntry) {
        return null;
      }

      // Check if expired
      if (Date.now() > cacheEntry.expires) {
        // Remove expired entry
        const deleteTransaction = this.db!.transaction(['cached-data'], 'readwrite');
        const deleteStore = deleteTransaction.objectStore('cached-data');
        deleteStore.delete(key);
        return null;
      }

      return JSON.parse(cacheEntry.data);
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return null;
    }
  }

  async clearExpiredCache(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(['cached-data'], 'readwrite');
      const store = transaction.objectStore('cached-data');
      const index = store.index('expires');
      
      const now = Date.now();
      const range = IDBKeyRange.upperBound(now);
      
      const request = index.openCursor(range);
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
    } catch (error) {
      console.error('Failed to clear expired cache:', error);
    }
  }

  async getStorageUsage(): Promise<{ used: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          available: estimate.quota || 0
        };
      } catch (error) {
        console.error('Failed to get storage estimate:', error);
      }
    }
    
    return { used: 0, available: 0 };
  }

  async clearAllData(): Promise<void> {
    if (!this.db) return;

    try {
      const objectStoreNames = Array.from(this.db.objectStoreNames);
      const transaction = this.db.transaction(objectStoreNames, 'readwrite');
      
      const clearPromises = objectStoreNames.map(storeName => {
        return new Promise<void>((resolve, reject) => {
          const request = transaction.objectStore(storeName).clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      });

      await Promise.all(clearPromises);
      console.log('Cleared all offline data');
      toast.success('Offline data cleared');
    } catch (error) {
      console.error('Failed to clear offline data:', error);
      toast.error('Failed to clear offline data');
    }
  }

  // Network-aware fetch with automatic offline queuing
  async safeFetch(
    url: string,
    options: RequestInit = {},
    cacheKey?: string,
    cacheTTL: number = 3600000
  ): Promise<Response> {
    try {
      if (navigator.onLine) {
        const response = await fetch(url, options);
        
        // Cache successful GET requests
        if (response.ok && options.method !== 'POST' && cacheKey) {
          const data = await response.clone().json();
          this.cacheData(cacheKey, data, cacheTTL);
        }
        
        return response;
      }
    } catch (error) {
      console.warn('Network request failed, trying offline:', error);
    }

    // If offline or network failed, try cache first
    if (cacheKey && options.method !== 'POST') {
      const cachedData = await this.getCachedData(cacheKey);
      if (cachedData) {
        return new Response(JSON.stringify(cachedData), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Queue POST/PUT/DELETE requests for later sync
    if (options.method && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
      await this.queueAction(
        url,
        options.method,
        options.headers as Record<string, string>,
        options.body as string
      );
      
      toast.info('Action queued for when you\'re back online');
      
      // Return a mock success response
      return new Response(JSON.stringify({ success: true, queued: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    throw new Error('Network unavailable and no cached data available');
  }
}

// Singleton instance
export const offlineSupport = new OfflineSupport();

// Auto-initialize when module loads
offlineSupport.init();

// Auto-sync when coming back online
window.addEventListener('online', () => {
  console.log('Network restored, syncing offline actions...');
  offlineSupport.syncOfflineActions();
  offlineSupport.clearExpiredCache();
});

// Periodic cache cleanup
setInterval(() => {
  offlineSupport.clearExpiredCache();
}, 5 * 60 * 1000); // Every 5 minutes

export default offlineSupport;