/**
 * Mobile Backend Service
 * 
 * Comprehensive service for React Native backend integration.
 * Handles cross-platform communication, data synchronization,
 * offline support, and security for mobile applications.
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

import React from 'react';
import { toast } from "sonner";
import { envConfig } from '../utils/envConfig';

// Types
interface MobileConfig {
  apiBaseUrl: string;
  wsUrl: string;
  apiKey: string;
  platform: 'web' | 'ios' | 'android';
  offlineMode: boolean;
  syncInterval: number;
  encryptionEnabled: boolean;
}

interface SyncData {
  lastSync: number;
  pendingOperations: Operation[];
  offlineData: Map<string, any>;
}

interface Operation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

interface MobileEvent {
  type: string;
  data: any;
  timestamp: number;
}

// Mobile Backend Service Class
export class MobileBackendService {
  private config: MobileConfig;
  private syncState: SyncData;
  private wsConnection: WebSocket | null = null;
  private isInitialized: boolean = false;
  private eventListeners: Map<string, ((event: MobileEvent) => void)[]> = new Map();
  private retryQueue: Operation[] = [];
  private syncTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<MobileConfig> = {}) {
    const apiBase = envConfig.API_URL.replace(/\/$/, '');

    this.config = {
      apiBaseUrl: apiBase ? `${apiBase}/api/v1` : '',
      wsUrl: envConfig.WEBSOCKET_URL || '',
      apiKey: 'mobile-client',
      platform: this.detectPlatform(),
      offlineMode: false,
      syncInterval: 30000, // 30 seconds
      encryptionEnabled: true,
      ...config
    };

    this.syncState = {
      lastSync: 0,
      pendingOperations: [],
      offlineData: new Map()
    };

    this.init();
  }

  /**
   * Detect current platform
   */
  private detectPlatform(): 'web' | 'ios' | 'android' {
    if (typeof window === 'undefined') return 'web';
    
    const userAgent = navigator.userAgent;
    if (/iPhone|iPad|iPod/.test(userAgent)) return 'ios';
    if (/Android/.test(userAgent)) return 'android';
    return 'web';
  }

  /**
   * Initialize the service
   */
  private async init(): Promise<void> {
    try {
      console.log('🚀 Initializing Mobile Backend Service');
      
      // Load persisted sync data
      await this.loadSyncData();

      if (this.config.apiBaseUrl && this.config.wsUrl) {
        this.initWebSocket();
      }

      if (this.config.apiBaseUrl) {
        this.startSyncTimer();
      }

      // Set up offline detection
      this.setupOfflineDetection();
      
      this.isInitialized = true;
      this.emit('service_initialized', { platform: this.config.platform });
      
      console.log('✅ Mobile Backend Service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Mobile Backend Service:', error);
      toast.error('Backend service initialization failed');
    }
  }

  /**
   * Load persisted sync data
   */
  private async loadSyncData(): Promise<void> {
    try {
      const stored = localStorage.getItem('mobile_sync_data');
      if (stored) {
        const data = JSON.parse(stored);
        this.syncState = {
          ...this.syncState,
          ...data,
          offlineData: new Map(data.offlineData || [])
        };
      }
    } catch (error) {
      console.warn('Failed to load sync data:', error);
    }
  }

  /**
   * Save sync data to storage
   */
  private async saveSyncData(): Promise<void> {
    try {
      const dataToStore = {
        ...this.syncState,
        offlineData: Array.from(this.syncState.offlineData.entries())
      };
      localStorage.setItem('mobile_sync_data', JSON.stringify(dataToStore));
    } catch (error) {
      console.warn('Failed to save sync data:', error);
    }
  }

  /**
   * Initialize WebSocket connection
   */
  private initWebSocket(): void {
    try {
      this.wsConnection = new WebSocket(`${this.config.wsUrl}?apiKey=${this.config.apiKey}`);
      
      this.wsConnection.onopen = () => {
        console.log('📡 WebSocket connected');
        this.emit('ws_connected', {});
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.wsConnection.onclose = () => {
        console.log('📡 WebSocket disconnected');
        this.emit('ws_disconnected', {});
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => this.initWebSocket(), 5000);
      };

      this.wsConnection.onerror = (error) => {
        console.error('📡 WebSocket error:', error);
        this.emit('ws_error', { error });
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleWebSocketMessage(data: any): void {
    switch (data.type) {
      case 'sync_request':
        this.handleSyncRequest(data);
        break;
      case 'data_update':
        this.handleDataUpdate(data);
        break;
      case 'notification':
        this.handleNotification(data);
        break;
      default:
        this.emit('ws_message', data);
    }
  }

  /**
   * Handle sync request from server
   */
  private async handleSyncRequest(data: any): Promise<void> {
    await this.syncData();
  }

  /**
   * Handle data update from server
   */
  private handleDataUpdate(data: any): void {
    const { entity, entityId, updateData } = data;
    
    // Update local cache
    const cacheKey = `${entity}_${entityId}`;
    this.syncState.offlineData.set(cacheKey, updateData);
    
    this.emit('data_updated', { entity, entityId, data: updateData });
    this.saveSyncData();
  }

  /**
   * Handle notification from server
   */
  private handleNotification(data: any): void {
    this.emit('notification', data);
    
    // Show toast notification
    if (data.showToast) {
      toast(data.message, {
        description: data.description,
        duration: data.duration || 5000
      });
    }
  }

  /**
   * Set up offline detection
   */
  private setupOfflineDetection(): void {
    const updateOnlineStatus = () => {
      const wasOffline = this.config.offlineMode;
      this.config.offlineMode = !navigator.onLine;
      
      if (wasOffline && !this.config.offlineMode) {
        // Just came back online - sync data
        this.syncData();
        this.emit('online', {});
        toast.success('📡 Back online - syncing data');
      } else if (!wasOffline && this.config.offlineMode) {
        this.emit('offline', {});
        toast.warning('📵 Offline mode activated');
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Initial check
    updateOnlineStatus();
  }

  /**
   * Start sync timer
   */
  private startSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      if (!this.config.offlineMode) {
        this.syncData();
      }
    }, this.config.syncInterval);
  }

  /**
   * Stop sync timer
   */
  private stopSyncTimer(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  /**
   * Make API request with offline support
   */
  public async apiRequest(
    endpoint: string, 
    options: RequestInit = {},
    useCache: boolean = true
  ): Promise<any> {
    if (!this.config.apiBaseUrl) {
      throw new Error('Mobile backend is not configured. Set VITE_API_URL for this deployment.');
    }

    const cacheKey = `api_${endpoint}_${JSON.stringify(options)}`;
    
    // If offline, return cached data
    if (this.config.offlineMode && useCache) {
      const cachedData = this.syncState.offlineData.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
      throw new Error('No offline data available');
    }

    try {
      const response = await fetch(`${this.config.apiBaseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.config.apiKey,
          'X-Platform': this.config.platform,
          ...options.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache successful responses
      if (useCache && options.method !== 'POST') {
        this.syncState.offlineData.set(cacheKey, data);
        this.saveSyncData();
      }

      return data;
    } catch (error) {
      // If request fails and we're not offline, queue it for retry
      if (!this.config.offlineMode && options.method === 'POST') {
        this.queueOperation({
          id: Date.now().toString(),
          type: 'create',
          entity: endpoint,
          data: options.body ? JSON.parse(options.body as string) : {},
          timestamp: Date.now(),
          retryCount: 0
        });
      }
      
      throw error;
    }
  }

  /**
   * Queue operation for offline processing
   */
  private queueOperation(operation: Operation): void {
    this.syncState.pendingOperations.push(operation);
    this.saveSyncData();
    this.emit('operation_queued', operation);
  }

  /**
   * Sync data with server
   */
  public async syncData(): Promise<void> {
    if (this.config.offlineMode || !this.isInitialized) {
      return;
    }

    try {
      console.log('🔄 Starting data sync');
      
      // Process pending operations
      await this.processPendingOperations();
      
      // Get server updates since last sync
      await this.fetchServerUpdates();
      
      this.syncState.lastSync = Date.now();
      this.saveSyncData();
      
      this.emit('sync_completed', { timestamp: this.syncState.lastSync });
      console.log('✅ Data sync completed');
    } catch (error) {
      console.error('❌ Data sync failed:', error);
      this.emit('sync_failed', { error });
    }
  }

  /**
   * Process pending operations
   */
  private async processPendingOperations(): Promise<void> {
    const operations = [...this.syncState.pendingOperations];
    this.syncState.pendingOperations = [];

    for (const operation of operations) {
      try {
        await this.executeOperation(operation);
        this.emit('operation_completed', operation);
      } catch (error) {
        console.error('Failed to execute operation:', error);
        
        // Retry failed operations
        if (operation.retryCount < 3) {
          operation.retryCount++;
          this.syncState.pendingOperations.push(operation);
        } else {
          this.emit('operation_failed', { operation, error });
        }
      }
    }
  }

  /**
   * Execute a single operation
   */
  private async executeOperation(operation: Operation): Promise<void> {
    const { type, entity, data } = operation;
    
    const options: RequestInit = {
      method: type === 'create' ? 'POST' : type === 'update' ? 'PUT' : 'DELETE',
      body: JSON.stringify(data)
    };

    await this.apiRequest(entity, options, false);
  }

  /**
   * Fetch updates from server
   */
  private async fetchServerUpdates(): Promise<void> {
    try {
      const response = await this.apiRequest(`/sync?since=${this.syncState.lastSync}`);
      
      if (response.updates) {
        for (const update of response.updates) {
          this.handleDataUpdate(update);
        }
      }
    } catch (error) {
      console.error('Failed to fetch server updates:', error);
    }
  }

  /**
   * Get cached data
   */
  public getCachedData(key: string): any {
    return this.syncState.offlineData.get(key);
  }

  /**
   * Set cached data
   */
  public setCachedData(key: string, data: any): void {
    this.syncState.offlineData.set(key, data);
    this.saveSyncData();
  }

  /**
   * Clear cached data
   */
  public clearCache(): void {
    this.syncState.offlineData.clear();
    this.saveSyncData();
    this.emit('cache_cleared', {});
  }

  /**
   * Send message to React Native
   */
  public sendToReactNative(message: any): void {
    if (this.config.platform !== 'web' && (window as any).ReactNativeWebView) {
      (window as any).ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }

  /**
   * Setup React Native message listener
   */
  public setupReactNativeListener(callback: (message: any) => void): () => void {
    const handler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        callback(message);
      } catch (error) {
        console.error('Failed to parse React Native message:', error);
      }
    };

    if (this.config.platform !== 'web') {
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }

    return () => {};
  }

  /**
   * Event system
   */
  public on(event: string, callback: (event: MobileEvent) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  public off(event: string, callback: (event: MobileEvent) => void): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(type: string, data: any): void {
    const event: MobileEvent = {
      type,
      data,
      timestamp: Date.now()
    };

    const listeners = this.eventListeners.get(type) || [];
    listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Event listener error:', error);
      }
    });
  }

  /**
   * Get service status
   */
  public getStatus(): {
    initialized: boolean;
    platform: string;
    offline: boolean;
    lastSync: number;
    pendingOperations: number;
    wsConnected: boolean;
  } {
    return {
      initialized: this.isInitialized,
      platform: this.config.platform,
      offline: this.config.offlineMode,
      lastSync: this.syncState.lastSync,
      pendingOperations: this.syncState.pendingOperations.length,
      wsConnected: this.wsConnection?.readyState === WebSocket.OPEN
    };
  }

  /**
   * Destroy the service
   */
  public destroy(): void {
    this.stopSyncTimer();
    
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    
    this.eventListeners.clear();
    this.isInitialized = false;
    
    console.log('🗑️ Mobile Backend Service destroyed');
  }
}

// Singleton instance
let mobileBackendServiceInstance: MobileBackendService | null = null;

/**
 * Get singleton instance of MobileBackendService
 */
export function getMobileBackendService(config?: Partial<MobileConfig>): MobileBackendService {
  if (!mobileBackendServiceInstance) {
    mobileBackendServiceInstance = new MobileBackendService(config);
  }
  return mobileBackendServiceInstance;
}

/**
 * React hook for using the mobile backend service
 */
export function useMobileBackend() {
  const [service] = React.useState(() => getMobileBackendService());
  const [status, setStatus] = React.useState(service.getStatus());

  React.useEffect(() => {
    const updateStatus = () => setStatus(service.getStatus());
    
    service.on('service_initialized', updateStatus);
    service.on('sync_completed', updateStatus);
    service.on('sync_failed', updateStatus);
    service.on('online', updateStatus);
    service.on('offline', updateStatus);
    
    // Update status every 30 seconds
    const interval = setInterval(updateStatus, 30000);
    
    return () => {
      clearInterval(interval);
      service.off('service_initialized', updateStatus);
      service.off('sync_completed', updateStatus);
      service.off('sync_failed', updateStatus);
      service.off('online', updateStatus);
      service.off('offline', updateStatus);
    };
  }, [service]);

  return {
    service,
    status,
    isOnline: !status.offline,
    isInitialized: status.initialized,
    lastSync: new Date(status.lastSync),
    pendingOperations: status.pendingOperations,
    wsConnected: status.wsConnected
  };
}

export default MobileBackendService;
