import { Property, User, Notification, ChatMessage, Booking } from '../types';
import { errorTracker, performanceMonitor } from './errorTracking';

interface OfflineData {
  properties: Property[];
  user: User | null;
  notifications: Notification[];
  chatMessages: ChatMessage[];
  bookings: Booking[];
  favorites: string[];
  searchHistory: string[];
  lastSync: string;
  version: string;
}

interface QueuedAction {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  resource: 'property' | 'booking' | 'message' | 'notification' | 'user';
  data: any;
  timestamp: string;
  retryCount: number;
  maxRetries: number;
}

interface SyncStatus {
  isOnline: boolean;
  lastSyncTime: string | null;
  pendingActions: number;
  syncInProgress: boolean;
  lastError: string | null;
}

class OfflineManager {
  private static instance: OfflineManager;
  private dbName = 'PropertyHubOfflineDB';
  private dbVersion = 2;
  private db: IDBDatabase | null = null;
  private syncQueue: QueuedAction[] = [];
  private syncStatus: SyncStatus = {
    isOnline: navigator.onLine,
    lastSyncTime: null,
    pendingActions: 0,
    syncInProgress: false,
    lastError: null
  };
  private listeners: Set<(status: SyncStatus) => void> = new Set();
  private maxRetries = 3;
  private retryDelay = 5000; // 5 seconds

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.initializeDatabase();
      await this.loadSyncQueue();
      this.setupNetworkListeners();
      await this.performInitialSync();
      
      console.log('✅ Offline Manager initialized successfully');
    } catch (error) {
      errorTracker.logError({
        code: 'OFFLINE_MANAGER_INIT_FAILED',
        message: `Failed to initialize offline manager: ${error instanceof Error ? error.message : 'Unknown error'}`,
        category: 'pwa',
        severity: 'high',
        context: {
          component: 'OfflineManager',
          function: 'initialize'
        }
      });
      throw error;
    }
  }

  private async initializeDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        errorTracker.logError({
          code: 'INDEXEDDB_OPEN_FAILED',
          message: 'Failed to open IndexedDB',
          category: 'database',
          severity: 'high'
        });
        reject(new Error('Failed to open offline database'));
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        
        this.db.onerror = (event) => {
          errorTracker.logError({
            code: 'INDEXEDDB_ERROR',
            message: 'IndexedDB error occurred',
            category: 'database',
            severity: 'medium',
            context: {
              additionalData: {
                error: (event.target as IDBRequest).error
              }
            }
          });
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('properties')) {
          const propertyStore = db.createObjectStore('properties', { keyPath: 'id' });
          propertyStore.createIndex('location', 'location', { unique: false });
          propertyStore.createIndex('type', 'type', { unique: false });
          propertyStore.createIndex('price', 'price', { unique: false });
        }

        if (!db.objectStoreNames.contains('userData')) {
          db.createObjectStore('userData', { keyPath: 'key' });
        }

        if (!db.objectStoreNames.contains('notifications')) {
          const notificationStore = db.createObjectStore('notifications', { keyPath: 'id' });
          notificationStore.createIndex('userId', 'userId', { unique: false });
          notificationStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('chatMessages')) {
          const messageStore = db.createObjectStore('chatMessages', { keyPath: 'id' });
          messageStore.createIndex('roomId', 'roomId', { unique: false });
          messageStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          db.createObjectStore('syncQueue', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('bookings')) {
          const bookingStore = db.createObjectStore('bookings', { keyPath: 'id' });
          bookingStore.createIndex('userId', 'userId', { unique: false });
          bookingStore.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.syncStatus.isOnline = true;
      this.notifyListeners();
      this.performSync().catch(console.error);
    });

    window.addEventListener('offline', () => {
      this.syncStatus.isOnline = false;
      this.notifyListeners();
    });
  }

  private async performInitialSync(): Promise<void> {
    if (this.syncStatus.isOnline) {
      await this.performSync();
    }
  }

  // Data Storage Methods
  async storeProperties(properties: Property[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['properties'], 'readwrite');
    const store = transaction.objectStore('properties');

    for (const property of properties) {
      await new Promise((resolve, reject) => {
        const request = store.put(property);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    }

    await this.updateLastSync();
  }

  async getStoredProperties(): Promise<Property[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['properties'], 'readonly');
    const store = transaction.objectStore('properties');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async storeUserData(key: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['userData'], 'readwrite');
    const store = transaction.objectStore('userData');

    return new Promise((resolve, reject) => {
      const request = store.put({ key, data, timestamp: new Date().toISOString() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUserData(key: string): Promise<any> {
    if (!this.db) return null;

    const transaction = this.db.transaction(['userData'], 'readonly');
    const store = transaction.objectStore('userData');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.data || null);
      request.onerror = () => reject(request.error);
    });
  }

  async storeNotifications(notifications: Notification[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const transaction = this.db.transaction(['notifications'], 'readwrite');
    const store = transaction.objectStore('notifications');

    for (const notification of notifications) {
      await new Promise((resolve, reject) => {
        const request = store.put(notification);
        request.onsuccess = () => resolve(undefined);
        request.onerror = () => reject(request.error);
      });
    }
  }

  async getStoredNotifications(userId?: string): Promise<Notification[]> {
    if (!this.db) return [];

    const transaction = this.db.transaction(['notifications'], 'readonly');
    const store = transaction.objectStore('notifications');

    if (userId) {
      const index = store.index('userId');
      return new Promise((resolve, reject) => {
        const request = index.getAll(userId);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Sync Queue Management
  async queueAction(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queuedAction: QueuedAction = {
      ...action,
      id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    this.syncQueue.push(queuedAction);
    this.syncStatus.pendingActions = this.syncQueue.length;
    this.notifyListeners();

    if (this.db) {
      const transaction = this.db.transaction(['syncQueue'], 'readwrite');
      const store = transaction.objectStore('syncQueue');
      store.put(queuedAction);
    }

    // Try to sync immediately if online
    if (this.syncStatus.isOnline) {
      this.performSync().catch(console.error);
    }
  }

  private async loadSyncQueue(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['syncQueue'], 'readonly');
    const store = transaction.objectStore('syncQueue');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        this.syncQueue = request.result;
        this.syncStatus.pendingActions = this.syncQueue.length;
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  private async saveSyncQueue(): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(['syncQueue'], 'readwrite');
    const store = transaction.objectStore('syncQueue');

    // Clear existing queue
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });

    // Save current queue
    for (const action of this.syncQueue) {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(action);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  // Sync Operations
  async performSync(): Promise<void> {
    if (!this.syncStatus.isOnline || this.syncStatus.syncInProgress) {
      return;
    }

    this.syncStatus.syncInProgress = true;
    this.syncStatus.lastError = null;
    this.notifyListeners();

    try {
      performanceMonitor.startMeasurement('offline_sync');

      // Process sync queue
      const failedActions: QueuedAction[] = [];

      for (const action of this.syncQueue) {
        try {
          await this.executeSyncAction(action);
        } catch (error) {
          action.retryCount++;
          if (action.retryCount < action.maxRetries) {
            failedActions.push(action);
          } else {
            errorTracker.logError({
              code: 'SYNC_ACTION_MAX_RETRIES',
              message: `Sync action exceeded max retries: ${action.type} ${action.resource}`,
              category: 'unknown',
              severity: 'medium',
              context: {
                additionalData: {
                  actionId: action.id,
                  retryCount: action.retryCount
                }
              }
            });
          }
        }
      }

      // Update sync queue with failed actions
      this.syncQueue = failedActions;
      this.syncStatus.pendingActions = this.syncQueue.length;
      await this.saveSyncQueue();

      // Update last sync time
      this.syncStatus.lastSyncTime = new Date().toISOString();
      await this.updateLastSync();

      performanceMonitor.endMeasurement('offline_sync');
      
    } catch (error) {
      this.syncStatus.lastError = error instanceof Error ? error.message : 'Unknown sync error';
      errorTracker.logError({
        code: 'OFFLINE_SYNC_FAILED',
        message: `Offline sync failed: ${this.syncStatus.lastError}`,
        category: 'unknown',
        severity: 'medium'
      });
    } finally {
      this.syncStatus.syncInProgress = false;
      this.notifyListeners();
    }
  }

  private async executeSyncAction(action: QueuedAction): Promise<void> {
    // In a real implementation, these would make actual API calls
    console.log(`Executing sync action: ${action.type} ${action.resource}`, action.data);
    
    // Simulate network delay and potential failure
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    // Simulate occasional failures for testing
    if (Math.random() < 0.1) {
      throw new Error(`Simulated sync failure for ${action.type} ${action.resource}`);
    }
  }

  private async updateLastSync(): Promise<void> {
    const timestamp = new Date().toISOString();
    await this.storeUserData('lastSync', timestamp);
  }

  // Search and filtering for offline data
  async searchOfflineProperties(query: string): Promise<Property[]> {
    const properties = await this.getStoredProperties();
    const lowercaseQuery = query.toLowerCase();

    return properties.filter(property => {
      const locationStr = typeof property.location === 'string' 
        ? property.location 
        : `${property.location.address || ''} ${property.location.city} ${property.location.region} ${property.location.country}`;
        
      return property.title.toLowerCase().includes(lowercaseQuery) ||
        locationStr.toLowerCase().includes(lowercaseQuery) ||
        property.description.toLowerCase().includes(lowercaseQuery) ||
        property.type.toLowerCase().includes(lowercaseQuery);
    });
  }

  async filterOfflineProperties(filters: {
    type?: string[];
    priceRange?: [number, number];
    location?: string[];
  }): Promise<Property[]> {
    const properties = await this.getStoredProperties();

    return properties.filter(property => {
      if (filters.type && filters.type.length > 0 && !filters.type.includes(property.type)) {
        return false;
      }

      const price = property.pricing?.amount || property.price || 0;
      if (filters.priceRange) {
        const [min, max] = filters.priceRange;
        if (price < min || price > max) {
          return false;
        }
      }

      if (filters.location && filters.location.length > 0) {
        const locationStr = typeof property.location === 'string' 
          ? property.location 
          : `${property.location.address || ''} ${property.location.city} ${property.location.region} ${property.location.country}`;
          
        const matchesLocation = filters.location.some(loc => 
          locationStr.toLowerCase().includes(loc.toLowerCase())
        );
        if (!matchesLocation) return false;
      }

      return true;
    });
  }

  // Cache Management
  async clearCache(): Promise<void> {
    if (!this.db) return;

    const stores = ['properties', 'notifications', 'chatMessages', 'bookings'];
    const transaction = this.db.transaction(stores, 'readwrite');

    for (const storeName of stores) {
      const store = transaction.objectStore(storeName);
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    console.log('✅ Offline cache cleared');
  }

  async getCacheSize(): Promise<number> {
    if (!this.db) return 0;

    let totalSize = 0;
    const stores = ['properties', 'userData', 'notifications', 'chatMessages', 'syncQueue', 'bookings'];
    
    for (const storeName of stores) {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore('store');
      
      const count = await new Promise<number>((resolve, reject) => {
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      totalSize += count;
    }

    return totalSize;
  }

  // Status and Listeners
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.getSyncStatus()));
  }

  // Cleanup
  async dispose(): Promise<void> {
    this.listeners.clear();
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

export const offlineManager = OfflineManager.getInstance();
export default offlineManager;