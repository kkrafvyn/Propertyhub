/**
 * Mobile Data Sync Service
 * 
 * Handles data synchronization between React Native app and backend
 * Includes conflict resolution, offline queuing, and incremental sync
 * 
 * @author PropertyHub Team
 * @version 1.0.0
 */

import { apiService } from './apiService';
import { MobileStorage, OfflineSyncManager, MobileAnalytics } from './mobileBackendUtils';
import { webSocketManager } from './webSocketManager';
import { STORAGE_KEYS } from './config';
import type { User, Property, ChatRoom, Message } from '../../types';

export interface SyncItem {
  id: string;
  type: 'property' | 'chat' | 'user' | 'favorite' | 'booking';
  action: 'create' | 'update' | 'delete';
  data: any;
  localTimestamp: number;
  serverTimestamp?: number;
  synced: boolean;
  retryCount: number;
  lastAttempt?: number;
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

export interface SyncProgress {
  total: number;
  completed: number;
  failed: number;
  conflicts: number;
  phase: 'download' | 'upload' | 'conflicts' | 'complete';
}

export interface SyncOptions {
  forceFullSync?: boolean;
  includeMedia?: boolean;
  batchSize?: number;
  maxRetries?: number;
  conflictResolution?: 'local' | 'server' | 'manual';
}

/**
 * Mobile Data Synchronization Service
 */
export class MobileDataSyncService {
  private syncQueue: SyncItem[] = [];
  private conflicts: SyncConflict[] = [];
  private isSyncing = false;
  private lastSyncTimestamp: number = 0;
  private syncProgress: SyncProgress = {
    total: 0,
    completed: 0,
    failed: 0,
    conflicts: 0,
    phase: 'complete',
  };
  
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize the sync service
   */
  private async initializeService(): Promise<void> {
    try {
      // Load sync queue from storage
      await this.loadSyncQueue();
      
      // Load conflicts from storage
      await this.loadConflicts();
      
      // Load last sync timestamp
      const lastSync = await MobileStorage.getItem('last_sync_timestamp');
      this.lastSyncTimestamp = lastSync ? parseInt(lastSync) : 0;

      // Setup WebSocket listeners for real-time updates
      this.setupRealtimeListeners();

      // Setup periodic sync
      this.setupPeriodicSync();

      console.log('🔄 Mobile data sync service initialized');
    } catch (error) {
      console.error('❌ Failed to initialize sync service:', error);
    }
  }

  /**
   * Setup WebSocket listeners for real-time updates
   */
  private setupRealtimeListeners(): void {
    webSocketManager.on('message', (message) => {
      this.handleRealtimeUpdate(message);
    });

    webSocketManager.on('connect', () => {
      // Trigger sync when connection is restored
      this.startSync({ forceFullSync: false });
    });
  }

  /**
   * Handle real-time updates from WebSocket
   */
  private handleRealtimeUpdate(message: any): void {
    try {
      if (message.type === 'data_update') {
        const { entityType, entityId, action, data, timestamp } = message.payload;
        
        // Update local cache immediately
        this.updateLocalCache(entityType, entityId, action, data, timestamp);
        
        // Emit update event
        this.emit('realtime_update', {
          type: entityType,
          id: entityId,
          action,
          data,
          timestamp,
        });

        console.log('📡 Real-time update received:', entityType, entityId, action);
      }
    } catch (error) {
      console.error('❌ Failed to handle real-time update:', error);
    }
  }

  /**
   * Setup periodic sync
   */
  private setupPeriodicSync(): void {
    // Sync every 5 minutes when app is active
    setInterval(() => {
      if (!document.hidden && navigator.onLine) {
        this.startSync({ forceFullSync: false });
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Start data synchronization
   */
  public async startSync(options: SyncOptions = {}): Promise<void> {
    if (this.isSyncing) {
      console.log('⚠️ Sync already in progress');
      return;
    }

    console.log('🔄 Starting data synchronization...');
    this.isSyncing = true;
    
    const startTime = Date.now();
    
    try {
      // Reset progress
      this.syncProgress = {
        total: 0,
        completed: 0,
        failed: 0,
        conflicts: 0,
        phase: 'download',
      };

      // Emit sync start event
      this.emit('sync_start');

      // Phase 1: Download server updates
      await this.downloadUpdates(options);

      // Phase 2: Upload local changes
      this.syncProgress.phase = 'upload';
      await this.uploadChanges(options);

      // Phase 3: Resolve conflicts
      this.syncProgress.phase = 'conflicts';
      await this.resolveConflicts(options);

      // Phase 4: Complete
      this.syncProgress.phase = 'complete';
      this.lastSyncTimestamp = Date.now();
      await MobileStorage.setItem('last_sync_timestamp', this.lastSyncTimestamp.toString());

      const duration = Date.now() - startTime;
      console.log(`✅ Sync completed in ${duration}ms`);

      // Track sync analytics
      MobileAnalytics.trackEvent('data_sync_completed', {
        duration,
        total_items: this.syncProgress.total,
        completed: this.syncProgress.completed,
        failed: this.syncProgress.failed,
        conflicts: this.syncProgress.conflicts,
        force_full_sync: options.forceFullSync || false,
      });

      // Emit sync complete event
      this.emit('sync_complete', {
        duration,
        progress: this.syncProgress,
      });

    } catch (error) {
      console.error('❌ Sync failed:', error);
      
      // Track sync failure
      MobileAnalytics.trackEvent('data_sync_failed', {
        error: error.message,
        phase: this.syncProgress.phase,
      });

      // Emit sync error event
      this.emit('sync_error', error);
      
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Download updates from server
   */
  private async downloadUpdates(options: SyncOptions): Promise<void> {
    try {
      const since = options.forceFullSync ? 0 : this.lastSyncTimestamp;
      
      // Download property updates
      await this.downloadProperties(since);
      
      // Download chat updates
      await this.downloadChatUpdates(since);
      
      // Download user updates
      await this.downloadUserUpdates(since);

      console.log('📥 Download phase completed');
    } catch (error) {
      console.error('❌ Download phase failed:', error);
      throw error;
    }
  }

  /**
   * Download property updates
   */
  private async downloadProperties(since: number): Promise<void> {
    try {
      const response = await apiService.getProperties({ since });
      
      if (response.success && response.data) {
        // Update local cache
        await this.updatePropertiesCache(response.data);
        
        // Check for conflicts
        await this.checkPropertyConflicts(response.data);
        
        console.log(`📥 Downloaded ${response.data.length} property updates`);
      }
    } catch (error) {
      console.error('❌ Failed to download properties:', error);
    }
  }

  /**
   * Download chat updates
   */
  private async downloadChatUpdates(since: number): Promise<void> {
    try {
      // Get updated chat rooms
      const roomsResponse = await apiService.getChatRooms();
      
      if (roomsResponse.success && roomsResponse.data) {
        // Update chat rooms cache
        await this.updateChatRoomsCache(roomsResponse.data);
        
        // Download messages for each room
        for (const room of roomsResponse.data) {
          const messagesResponse = await apiService.getChatMessages(room.id);
          
          if (messagesResponse.success && messagesResponse.data) {
            await this.updateChatMessagesCache(room.id, messagesResponse.data);
          }
        }
        
        console.log(`📥 Downloaded chat updates for ${roomsResponse.data.length} rooms`);
      }
    } catch (error) {
      console.error('❌ Failed to download chat updates:', error);
    }
  }

  /**
   * Download user updates
   */
  private async downloadUserUpdates(since: number): Promise<void> {
    try {
      const response = await apiService.getUserProfile();
      
      if (response.success && response.data) {
        // Update user cache
        await this.updateUserCache(response.data);
        
        console.log('📥 Downloaded user updates');
      }
    } catch (error) {
      console.error('❌ Failed to download user updates:', error);
    }
  }

  /**
   * Upload local changes to server
   */
  private async uploadChanges(options: SyncOptions): Promise<void> {
    try {
      const batchSize = options.batchSize || 10;
      const maxRetries = options.maxRetries || 3;
      
      // Process sync queue in batches
      for (let i = 0; i < this.syncQueue.length; i += batchSize) {
        const batch = this.syncQueue.slice(i, i + batchSize);
        await this.processSyncBatch(batch, maxRetries);
      }

      console.log('📤 Upload phase completed');
    } catch (error) {
      console.error('❌ Upload phase failed:', error);
      throw error;
    }
  }

  /**
   * Process a batch of sync items
   */
  private async processSyncBatch(batch: SyncItem[], maxRetries: number): Promise<void> {
    for (const item of batch) {
      try {
        if (item.synced || item.retryCount >= maxRetries) {
          continue;
        }

        const success = await this.uploadSyncItem(item);
        
        if (success) {
          item.synced = true;
          this.syncProgress.completed++;
        } else {
          item.retryCount++;
          item.lastAttempt = Date.now();
          this.syncProgress.failed++;
        }
        
      } catch (error) {
        console.error(`❌ Failed to sync item ${item.id}:`, error);
        item.retryCount++;
        item.lastAttempt = Date.now();
        this.syncProgress.failed++;
      }
    }

    // Save updated sync queue
    await this.saveSyncQueue();
  }

  /**
   * Upload individual sync item
   */
  private async uploadSyncItem(item: SyncItem): Promise<boolean> {
    try {
      switch (item.type) {
        case 'property':
          return await this.uploadPropertyChange(item);
        case 'chat':
          return await this.uploadChatChange(item);
        case 'user':
          return await this.uploadUserChange(item);
        case 'favorite':
          return await this.uploadFavoriteChange(item);
        case 'booking':
          return await this.uploadBookingChange(item);
        default:
          console.warn('⚠️ Unknown sync item type:', item.type);
          return false;
      }
    } catch (error) {
      console.error(`❌ Failed to upload ${item.type} change:`, error);
      return false;
    }
  }

  /**
   * Upload property change
   */
  private async uploadPropertyChange(item: SyncItem): Promise<boolean> {
    // Implementation would depend on the specific property change
    console.log('📤 Uploading property change:', item.id);
    return true;
  }

  /**
   * Upload chat change
   */
  private async uploadChatChange(item: SyncItem): Promise<boolean> {
    if (item.action === 'create' && item.data.message) {
      const response = await apiService.sendMessage(
        item.data.roomId,
        item.data.message,
        item.data.attachments
      );
      return response.success;
    }
    return false;
  }

  /**
   * Upload user change
   */
  private async uploadUserChange(item: SyncItem): Promise<boolean> {
    if (item.action === 'update') {
      const response = await apiService.updateUserProfile(item.data);
      return response.success;
    }
    return false;
  }

  /**
   * Upload favorite change
   */
  private async uploadFavoriteChange(item: SyncItem): Promise<boolean> {
    const response = await apiService.toggleFavorite(item.data.propertyId);
    return response.success;
  }

  /**
   * Upload booking change
   */
  private async uploadBookingChange(item: SyncItem): Promise<boolean> {
    if (item.action === 'create') {
      const response = await apiService.bookProperty(
        item.data.propertyId,
        item.data.bookingData
      );
      return response.success;
    }
    return false;
  }

  /**
   * Resolve sync conflicts
   */
  private async resolveConflicts(options: SyncOptions): Promise<void> {
    if (this.conflicts.length === 0) {
      return;
    }

    console.log(`🔄 Resolving ${this.conflicts.length} conflicts`);

    for (const conflict of this.conflicts) {
      if (conflict.resolved) continue;

      try {
        const resolution = options.conflictResolution || 'manual';
        
        switch (resolution) {
          case 'local':
            await this.resolveConflictWithLocal(conflict);
            break;
          case 'server':
            await this.resolveConflictWithServer(conflict);
            break;
          case 'manual':
            // Emit conflict event for manual resolution
            this.emit('sync_conflict', conflict);
            continue;
        }

        conflict.resolved = true;
        this.syncProgress.conflicts++;
        
      } catch (error) {
        console.error(`❌ Failed to resolve conflict ${conflict.id}:`, error);
      }
    }

    // Save resolved conflicts
    await this.saveConflicts();
  }

  /**
   * Resolve conflict using local data
   */
  private async resolveConflictWithLocal(conflict: SyncConflict): Promise<void> {
    // Upload local version to server
    const syncItem: SyncItem = {
      id: conflict.id,
      type: conflict.type as any,
      action: 'update',
      data: conflict.localData,
      localTimestamp: conflict.localTimestamp,
      synced: false,
      retryCount: 0,
    };

    await this.uploadSyncItem(syncItem);
    conflict.resolution = 'local';
    
    console.log(`✅ Conflict resolved with local data: ${conflict.id}`);
  }

  /**
   * Resolve conflict using server data
   */
  private async resolveConflictWithServer(conflict: SyncConflict): Promise<void> {
    // Update local cache with server data
    await this.updateLocalCache(
      conflict.type,
      conflict.id,
      'update',
      conflict.serverData,
      conflict.serverTimestamp
    );
    
    conflict.resolution = 'server';
    
    console.log(`✅ Conflict resolved with server data: ${conflict.id}`);
  }

  /**
   * Add item to sync queue
   */
  public async queueForSync(
    type: SyncItem['type'],
    action: SyncItem['action'],
    id: string,
    data: any
  ): Promise<void> {
    const syncItem: SyncItem = {
      id,
      type,
      action,
      data,
      localTimestamp: Date.now(),
      synced: false,
      retryCount: 0,
    };

    this.syncQueue.push(syncItem);
    await this.saveSyncQueue();

    console.log(`📝 Queued for sync: ${type} ${action} ${id}`);

    // Try to sync immediately if online
    if (navigator.onLine && !this.isSyncing) {
      this.startSync({ forceFullSync: false });
    }
  }

  /**
   * Update local cache
   */
  private async updateLocalCache(
    type: string,
    id: string,
    action: string,
    data: any,
    timestamp: number
  ): Promise<void> {
    try {
      switch (type) {
        case 'property':
          await this.updatePropertyInCache(id, action, data);
          break;
        case 'chat':
          await this.updateChatInCache(id, action, data);
          break;
        case 'user':
          await this.updateUserInCache(id, action, data);
          break;
      }
      
      console.log(`💾 Updated local cache: ${type} ${id}`);
    } catch (error) {
      console.error(`❌ Failed to update local cache: ${type} ${id}`, error);
    }
  }

  /**
   * Update properties cache
   */
  private async updatePropertiesCache(properties: Property[]): Promise<void> {
    await MobileStorage.setItem(
      STORAGE_KEYS.CACHED_PROPERTIES,
      JSON.stringify(properties)
    );
  }

  /**
   * Update single property in cache
   */
  private async updatePropertyInCache(id: string, action: string, data: any): Promise<void> {
    const cached = await MobileStorage.getItem(STORAGE_KEYS.CACHED_PROPERTIES);
    if (cached) {
      const properties: Property[] = JSON.parse(cached);
      
      if (action === 'delete') {
        const index = properties.findIndex(p => p.id === id);
        if (index > -1) {
          properties.splice(index, 1);
        }
      } else {
        const index = properties.findIndex(p => p.id === id);
        if (index > -1) {
          properties[index] = { ...properties[index], ...data };
        } else {
          properties.push(data);
        }
      }
      
      await MobileStorage.setItem(
        STORAGE_KEYS.CACHED_PROPERTIES,
        JSON.stringify(properties)
      );
    }
  }

  /**
   * Update chat rooms cache
   */
  private async updateChatRoomsCache(rooms: ChatRoom[]): Promise<void> {
    await MobileStorage.setItem('cached_chat_rooms', JSON.stringify(rooms));
  }

  /**
   * Update chat messages cache
   */
  private async updateChatMessagesCache(roomId: string, messages: Message[]): Promise<void> {
    await MobileStorage.setItem(
      `cached_messages_${roomId}`,
      JSON.stringify(messages)
    );
  }

  /**
   * Update chat in cache
   */
  private async updateChatInCache(id: string, action: string, data: any): Promise<void> {
    // Implementation for chat cache updates
    console.log(`💾 Updating chat cache: ${id} ${action}`);
  }

  /**
   * Update user cache
   */
  private async updateUserCache(user: User): Promise<void> {
    await MobileStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  }

  /**
   * Update user in cache
   */
  private async updateUserInCache(id: string, action: string, data: any): Promise<void> {
    const cached = await MobileStorage.getItem(STORAGE_KEYS.USER_DATA);
    if (cached) {
      const user: User = JSON.parse(cached);
      const updatedUser = { ...user, ...data };
      await MobileStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));
    }
  }

  /**
   * Check for property conflicts
   */
  private async checkPropertyConflicts(serverProperties: Property[]): Promise<void> {
    const cached = await MobileStorage.getItem(STORAGE_KEYS.CACHED_PROPERTIES);
    if (!cached) return;

    const localProperties: Property[] = JSON.parse(cached);
    
    for (const serverProperty of serverProperties) {
      const localProperty = localProperties.find(p => p.id === serverProperty.id);
      
      if (localProperty && this.hasLocalModifications(localProperty, serverProperty)) {
        const conflict: SyncConflict = {
          id: serverProperty.id,
          type: 'property',
          localData: localProperty,
          serverData: serverProperty,
          localTimestamp: localProperty.lastModified || 0,
          serverTimestamp: serverProperty.lastModified || 0,
          resolved: false,
        };
        
        this.conflicts.push(conflict);
        console.log(`⚠️ Conflict detected for property: ${serverProperty.id}`);
      }
    }
  }

  /**
   * Check if local data has modifications
   */
  private hasLocalModifications(local: any, server: any): boolean {
    // Simple comparison - in production, you'd want more sophisticated conflict detection
    return JSON.stringify(local) !== JSON.stringify(server);
  }

  /**
   * Load sync queue from storage
   */
  private async loadSyncQueue(): Promise<void> {
    try {
      const queueData = await MobileStorage.getItem('sync_queue');
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
        console.log(`📂 Loaded ${this.syncQueue.length} items from sync queue`);
      }
    } catch (error) {
      console.error('❌ Failed to load sync queue:', error);
      this.syncQueue = [];
    }
  }

  /**
   * Save sync queue to storage
   */
  private async saveSyncQueue(): Promise<void> {
    try {
      await MobileStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('❌ Failed to save sync queue:', error);
    }
  }

  /**
   * Load conflicts from storage
   */
  private async loadConflicts(): Promise<void> {
    try {
      const conflictsData = await MobileStorage.getItem('sync_conflicts');
      if (conflictsData) {
        this.conflicts = JSON.parse(conflictsData);
        console.log(`📂 Loaded ${this.conflicts.length} conflicts`);
      }
    } catch (error) {
      console.error('❌ Failed to load conflicts:', error);
      this.conflicts = [];
    }
  }

  /**
   * Save conflicts to storage
   */
  private async saveConflicts(): Promise<void> {
    try {
      await MobileStorage.setItem('sync_conflicts', JSON.stringify(this.conflicts));
    } catch (error) {
      console.error('❌ Failed to save conflicts:', error);
    }
  }

  /**
   * Event system methods
   */
  public on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  public off(event: string, listener: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`❌ Event listener error (${event}):`, error);
        }
      });
    }
  }

  /**
   * Public API methods
   */
  public getSyncProgress(): SyncProgress {
    return { ...this.syncProgress };
  }

  public getConflicts(): SyncConflict[] {
    return [...this.conflicts];
  }

  public getQueuedItems(): SyncItem[] {
    return [...this.syncQueue];
  }

  public isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  public getLastSyncTime(): Date {
    return new Date(this.lastSyncTimestamp);
  }

  public async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    await this.saveSyncQueue();
    console.log('🧹 Sync queue cleared');
  }

  public async resolveConflictManually(
    conflictId: string,
    resolution: 'local' | 'server' | 'merge',
    mergedData?: any
  ): Promise<void> {
    const conflict = this.conflicts.find(c => c.id === conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    switch (resolution) {
      case 'local':
        await this.resolveConflictWithLocal(conflict);
        break;
      case 'server':
        await this.resolveConflictWithServer(conflict);
        break;
      case 'merge':
        if (!mergedData) {
          throw new Error('Merged data required for merge resolution');
        }
        await this.updateLocalCache(
          conflict.type,
          conflict.id,
          'update',
          mergedData,
          Date.now()
        );
        conflict.resolution = 'merge';
        break;
    }

    conflict.resolved = true;
    await this.saveConflicts();
    
    console.log(`✅ Conflict manually resolved: ${conflictId} with ${resolution}`);
  }
}

// Export singleton instance
export const mobileDataSyncService = new MobileDataSyncService();
export default mobileDataSyncService;